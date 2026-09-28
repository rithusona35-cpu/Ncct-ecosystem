#!/usr/bin/env python3
"""
NCCT Kiosk Simulator - Standalone Python Hardware Gateway / Script
Features:
- Local-first attendance scanning (tries POST /api/attendance/mark first)
- On network failure, records stored in local SQLite database (kiosk_offline.db)
- Background auto-sync worker every 30 seconds to POST /api/attendance/sync-batch
- Automatic queue clearing upon successful sync with server
- Idempotent deduplication guarantee
"""

import os
import sys
import time
import sqlite3
import argparse
import requests
import threading
from datetime import datetime
from typing import List, Dict, Any, Optional

BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kiosk_offline.db")

def init_db(db_path: str = DB_FILE):
    """Initializes the local SQLite database for offline attendance queuing."""
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS offline_attendance_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                trainee_qr_code TEXT NOT NULL,
                session_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                status TEXT DEFAULT 'QUEUED',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()

def queue_offline_record(device_id: str, trainee_qr_code: str, session_id: str, timestamp: str, db_path: str = DB_FILE) -> int:
    """Stores an attendance record into the local SQLite database when backend is unreachable."""
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO offline_attendance_queue (device_id, trainee_qr_code, session_id, timestamp, status)
            VALUES (?, ?, ?, ?, 'QUEUED')
        """, (device_id, trainee_qr_code, session_id, timestamp))
        conn.commit()
        return cursor.lastrowid

def get_queued_records(db_path: str = DB_FILE) -> List[Dict[str, Any]]:
    """Returns all unsynced attendance records from local SQLite database."""
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT id, device_id, trainee_qr_code, session_id, timestamp FROM offline_attendance_queue WHERE status = 'QUEUED' ORDER BY id ASC")
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

def remove_synced_records(record_ids: List[int], db_path: str = DB_FILE):
    """Deletes successfully synced records from local SQLite database."""
    if not record_ids:
        return
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        placeholders = ",".join("?" * len(record_ids))
        cursor.execute(f"DELETE FROM offline_attendance_queue WHERE id IN ({placeholders})", record_ids)
        conn.commit()

def mark_attendance_local_first(
    trainee_qr_code: str,
    device_id: str = "ESP32-S3-SIM-01",
    session_id: str = "SESSION-MAIN",
    timestamp: Optional[str] = None,
    backend_url: str = BACKEND_URL,
    db_path: str = DB_FILE
) -> Dict[str, Any]:
    """
    Local-first scan logic:
    1. Try POST /api/attendance/mark first.
    2. On network failure (server down, timeout), queues locally in SQLite with visible Offline - Queued indicator.
    """
    init_db(db_path)
    now_iso = timestamp or datetime.utcnow().isoformat() + "Z"
    mark_payload = {
        "device_id": device_id,
        "trainee_qr_code": trainee_qr_code.strip(),
        "session_id": session_id,
        "timestamp": now_iso
    }

    try:
        url = f"{backend_url.rstrip('/')}/api/attendance/mark"
        res = requests.post(url, json=mark_payload, timeout=2.0)
        if res.status_code == 200:
            data = res.json()
            print(f"[ONLINE] Scan processed by server: {data.get('status')} - {data.get('message')}")
            return {**data, "is_offline": False}
        else:
            raise requests.exceptions.RequestException(f"HTTP {res.status_code}: {res.text}")
    except (requests.exceptions.RequestException, requests.exceptions.ConnectionError, requests.exceptions.Timeout) as exc:
        # Backend is offline or unreachable: queue locally
        row_id = queue_offline_record(device_id, trainee_qr_code, session_id, now_iso, db_path)
        print(f"[OFFLINE - QUEUED] Server unreachable ({type(exc).__name__}). Scan stored in SQLite queue (ID: {row_id}).")
        return {
            "status": "OFFLINE_QUEUED",
            "buzzer": "BEEP_WARN",
            "message": "Offline - Queued: Backend unreachable. Scan saved to local SQLite queue.",
            "trainee_id": trainee_qr_code,
            "timestamp": now_iso,
            "local_queue_id": row_id,
            "is_offline": True
        }

def sync_batch_from_sqlite(backend_url: str = BACKEND_URL, db_path: str = DB_FILE) -> Optional[Dict[str, Any]]:
    """Checks for unsynced local records and POSTs them as a batch to /api/attendance/sync-batch."""
    init_db(db_path)
    records = get_queued_records(db_path)
    if not records:
        return None

    batch_payload = {
        "records": [
            {
                "device_id": r["device_id"],
                "trainee_qr_code": r["trainee_qr_code"],
                "session_id": r["session_id"],
                "timestamp": r["timestamp"]
            }
            for r in records
        ]
    }

    try:
        url = f"{backend_url.rstrip('/')}/api/attendance/sync-batch"
        res = requests.post(url, json=batch_payload, timeout=5.0)
        if res.status_code == 200:
            data = res.json()
            record_ids = [r["id"] for r in records]
            remove_synced_records(record_ids, db_path)
            print(f"[SYNC SUCCESS] Synced {data.get('synced_count')} records ({data.get('duplicate_count')} duplicates skipped). Cleared from SQLite.")
            return data
        else:
            print(f"[SYNC FAILED] Server returned {res.status_code}: {res.text}")
            return None
    except requests.exceptions.RequestException as exc:
        print(f"[SYNC RETRY] Server still unreachable ({type(exc).__name__}). Will retry on next 30s cycle.")
        return None

def start_background_sync_worker(interval_seconds: int = 30, backend_url: str = BACKEND_URL, db_path: str = DB_FILE, stop_event: Optional[threading.Event] = None):
    """Runs periodic background sync check every 30 seconds."""
    def worker():
        while stop_event is None or not stop_event.is_set():
            sync_batch_from_sqlite(backend_url, db_path)
            # Sleep in small slices to respond to stop_event
            for _ in range(interval_seconds):
                if stop_event and stop_event.is_set():
                    return
                time.sleep(1)

    t = threading.Thread(target=worker, daemon=True)
    t.start()
    return t

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NCCT Kiosk Offline-First Simulator")
    parser.add_argument("--scan", type=str, help="Trainee QR code to scan (e.g. NCCT-TR-2026-00001)")
    parser.add_argument("--device", type=str, default="ESP32-S3-SIM-01", help="Device ID")
    parser.add_argument("--session", type=str, default="SESSION-MAIN", help="Session ID")
    parser.add_argument("--sync", action="store_true", help="Trigger immediate batch sync")
    parser.add_argument("--daemon", action="store_true", help="Run background sync worker daemon (every 30s)")
    args = parser.parse_args()

    init_db()

    if args.scan:
        res = mark_attendance_local_first(args.scan, device_id=args.device, session_id=args.session)
        print("Result:", res)

    if args.sync:
        sync_batch_from_sqlite()

    if args.daemon:
        print(f"[KIOSK SIMULATOR] Running background sync daemon (interval: 30s)... Press Ctrl+C to stop.")
        stop_evt = threading.Event()
        start_background_sync_worker(interval_seconds=30, stop_event=stop_evt)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            stop_evt.set()
            print("Daemon stopped.")

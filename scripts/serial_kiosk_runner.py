#!/usr/bin/env python3
"""
NCCT ESP32-S3 Firmware Serial Debugger & Test Simulator
Usage:
  # 1. Interactive Test Mode (Simulate typing in Serial Monitor):
  python scripts/serial_kiosk_runner.py --simulate

  # 2. Direct scan test:
  python scripts/serial_kiosk_runner.py --scan NCCT-TR-2026-00001

  # 3. Connect to physical ESP32 COM port (if plugged in):
  python scripts/serial_kiosk_runner.py --port COM3
"""

import sys
import os
import time
import json
import argparse
import requests
from datetime import datetime

# Default backend URL (matches config.h)
BACKEND_URL = os.getenv("BACKEND_URL", "http://10.73.49.221:8000")
DEVICE_ID = "ESP32-S3-GATE-01"
SESSION_ID = "SESSION-MAIN"

def simulate_esp32_firmware_scan(trainee_id: str, backend_url: str = BACKEND_URL):
    """
    Replicates the exact firmware logic and verbose serial logging of esp32_kiosk.ino.
    Sends POST /api/attendance/mark to the live backend and prints step-by-step debug traces.
    """
    start_time = time.time()
    now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    print("\n==================================================================")
    print(f"[INPUT DETECTED] Serial Monitor simulated scan: '{trainee_id}'")
    print("==================================================================")

    # Step 1: Log QR Code received
    print(f"[STEP 1/4] QR Code Received from [SERIAL_MONITOR_TEST]")
    print(f"           Payload Text: \"{trainee_id}\" (Length: {len(trainee_id)} bytes)")

    # Step 2: Build JSON payload
    print("[STEP 2/4] Constructing JSON Payload...")
    payload = {
        "device_id": DEVICE_ID,
        "trainee_qr_code": trainee_id.strip(),
        "session_id": SESSION_ID,
        "timestamp": now_iso
    }
    json_str = json.dumps(payload, separators=(',', ':'))
    print("           JSON Built Successfully:")
    print(f"           {json_str}")

    # Step 3: Dispatch HTTP POST to backend
    target_url = f"{backend_url.rstrip('/')}/api/attendance/mark"
    print("[STEP 3/4] Preparing HTTP POST request...")
    print(f"           Target URL: {target_url}")
    print("           Sending POST body to backend server...")

    try:
        res = requests.post(
            target_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=5.0
        )
        duration_ms = int((time.time() - start_time) * 1000)

        # Step 4: Parse response & verdict
        print("[STEP 4/4] Response received from Backend:")
        status_desc = " (200 OK)" if res.status_code == 200 else f" ({res.status_code})"
        print(f"           HTTP Status Code: {res.status_code}{status_desc}")
        print(f"           Response Body: {res.text}")

        data = res.json() if res.status_code == 200 else {}
        status = data.get("status")

        if status == "OK":
            print("\n>>> [VERDICT: ATTENDANCE VERIFIED] Check-in confirmed! <<<")
            print(f"    Trainee: {data.get('trainee_name')} ({data.get('trainee_id')})")
            print(f"    Buzzer:  {data.get('buzzer')} [GREEN LED CHIRP]")
            print(f"    Source:  {data.get('synced_from')} (Hardware IoT Gateway)")
        elif status == "DUPLICATE":
            print("\n>>> [VERDICT: DUPLICATE SCAN] Trainee already checked in today! <<<")
            print(f"    Message: {data.get('message')}")
            print(f"    Buzzer:  {data.get('buzzer')} [AMBER LED WARN]")
        elif status == "INVALID":
            print("\n>>> [VERDICT: INVALID CODE] Unregistered Trainee QR Code! <<<")
            print(f"    Message: {data.get('message')}")
            print(f"    Buzzer:  {data.get('buzzer')} [RED LED ERROR]")
        else:
            print(f"\n>>> [VERDICT: NOTICE] Server response status: {status} <<<")

        print(f"           Processing Time: {duration_ms} ms")
        print("==================================================================\n")
        return data

    except requests.exceptions.RequestException as err:
        print(f"[ERROR] HTTP connection failed: {err}")
        print("        Verify backend IP address in config.h and network accessibility.")
        print("==================================================================\n")
        return None

def interactive_serial_console():
    """Interactive loop simulating Serial Monitor input."""
    print("\n==================================================================")
    print("     NCCT ECOSYSTEM - ESP32-S3 SERIAL MONITOR TEST CONSOLE        ")
    print("     Target Backend: " + BACKEND_URL)
    print("==================================================================")
    print(" [SERIAL TEST MODE ACTIVE]")
    print(" Type a Trainee ID and press ENTER to simulate a scan.")
    print(" Type 'quit' or 'exit' to stop.")
    print(" Quick examples:")
    print("   1. NCCT-TR-2026-00001  (Vikram Sharma)")
    print("   2. NCCT-TR-2026-99999  (Sunita Rao)")
    print("   3. INVALID-QR-TEST     (Invalid code test)")
    print("------------------------------------------------------------------\n")

    while True:
        try:
            line = input("Serial Monitor > ").strip()
            if not line:
                continue
            if line.lower() in ("quit", "exit"):
                print("Exiting Serial Monitor.")
                break
            simulate_esp32_firmware_scan(line)
        except (KeyboardInterrupt, EOFError):
            print("\nExiting.")
            break

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NCCT ESP32-S3 Firmware Debugger")
    parser.add_argument("--scan", type=str, help="Trainee ID to scan (e.g. NCCT-TR-2026-00001)")
    parser.add_argument("--simulate", action="store_true", help="Launch interactive Serial Monitor simulation")
    parser.add_argument("--url", type=str, default=BACKEND_URL, help="Backend URL override")
    args = parser.parse_args()

    if args.scan:
        simulate_esp32_firmware_scan(args.scan, backend_url=args.url)
    elif args.simulate:
        interactive_serial_console()
    else:
        # Default to single scan of Vikram Sharma if no args
        simulate_esp32_firmware_scan("NCCT-TR-2026-00001", backend_url=args.url)

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { authApi } from '../../lib/api';
import { AttendanceMarkResponse, SyncBatchItem } from '../../lib/types';
import {
  openOfflineDB,
  addOfflineAttendance,
  getOfflineAttendanceQueue,
  removeOfflineAttendance,
  clearOfflineAttendanceQueue,
  getOfflineAttendanceCount,
  OfflineAttendanceRecord,
} from '../../lib/attendanceOfflineDB';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Volume2,
  VolumeX,
  Cpu,
  RefreshCw,
  Clock,
  ShieldCheck,
  Send,
  Zap,
  Radio,
  Sliders,
  Sparkles,
  ArrowLeft,
  Wifi,
  WifiOff,
  Database,
  CloudOff,
  Trash2,
  Check,
  Layers
} from 'lucide-react';
import Link from 'next/link';

// Tone synthesizer for hardware buzzer simulation
function playBuzzerTone(type: 'BEEP_SUCCESS' | 'BEEP_WARN' | 'BEEP_ERROR') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'BEEP_SUCCESS') {
      // High pitch pleasant double chime: 880Hz -> 1320Hz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'BEEP_WARN') {
      // Double warning beep: 550Hz twice
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(550, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.setValueAtTime(0.01, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else {
      // Error buzz: 220Hz saw wave
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    console.error('Audio synthesizer not allowed or supported', e);
  }
}

export default function KioskSimulatorPage() {
  const [deviceId, setDeviceId] = useState('KIOSK-SIM-01');
  const [sessionId, setSessionId] = useState('SESSION-TODAY');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannerInstance, setScannerInstance] = useState<any>(null);

  // Feedback display state (simulating LED & Buzzer)
  const [lastResponse, setLastResponse] = useState<AttendanceMarkResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Manual test input
  const [manualCode, setManualCode] = useState('NCCT-TR-2026-00001');

  // Real-time scan logs on this kiosk
  const [recentScans, setRecentScans] = useState<AttendanceMarkResponse[]>([]);

  // Offline-First Sync & IndexedDB State
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [queueCount, setQueueCount] = useState<number>(0);
  const [queuedRecords, setQueuedRecords] = useState<OfflineAttendanceRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [secondsUntilSync, setSecondsUntilSync] = useState<number>(30);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [showQueueModal, setShowQueueModal] = useState<boolean>(false);

  // Simulation mode: user can toggle forced offline testing right from the simulator
  const [forceOfflineMode, setForceOfflineMode] = useState<boolean>(false);

  // Refresh queue count and records from IndexedDB
  const refreshQueue = useCallback(async () => {
    try {
      const items = await getOfflineAttendanceQueue();
      setQueuedRecords(items);
      setQueueCount(items.length);
    } catch (e) {
      console.error('Error refreshing offline queue:', e);
    }
  }, []);

  // Initial load: initialize IndexedDB and fetch pending queue
  useEffect(() => {
    refreshQueue();
  }, [refreshQueue]);

  // Background sync worker: runs every 30 seconds
  const performSync = useCallback(async () => {
    if (isSyncing) return;

    try {
      const items = await getOfflineAttendanceQueue();
      if (!items || items.length === 0) {
        setQueueCount(0);
        setQueuedRecords([]);
        return;
      }

      setIsSyncing(true);

      if (forceOfflineMode) {
        setIsOnline(false);
        return;
      }

      const batchItems: SyncBatchItem[] = items.map((r) => ({
        device_id: r.device_id,
        trainee_qr_code: r.trainee_qr_code,
        session_id: r.session_id,
        programme_id: r.programme_id,
        timestamp: r.timestamp,
      }));

      const res = await authApi.syncBatchAttendance(batchItems);

      // Successfully reached server: remove synced IDs from IndexedDB
      const syncedIds = items.map((r) => r.id!).filter(Boolean);
      await removeOfflineAttendance(syncedIds);

      await refreshQueue();
      setIsOnline(true);

      const msg = `Auto-sync success: ${res.synced_count} synced, ${res.duplicate_count} duplicates skipped.`;
      setSyncToast(msg);
      setTimeout(() => setSyncToast(null), 6000);

      if (soundEnabled && res.synced_count > 0) {
        playBuzzerTone('BEEP_SUCCESS');
      }

      // Update recent scans list to indicate these records are now synced
      setRecentScans((prev) =>
        prev.map((scan) => {
          if (scan.status === 'OFFLINE_QUEUED') {
            return {
              ...scan,
              status: 'OK',
              message: `Synced with server: ${scan.trainee_name || scan.trainee_id}`,
            };
          }
          return scan;
        })
      );
    } catch (err: any) {
      console.warn('Background sync failed - backend unreachable:', err);
      setIsOnline(false);
    } finally {
      setIsSyncing(false);
      setSecondsUntilSync(30);
    }
  }, [isSyncing, forceOfflineMode, refreshQueue, soundEnabled]);

  // Background interval: 1-second tick for countdown and sync trigger
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsUntilSync((prev) => {
        if (prev <= 1) {
          performSync();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [performSync]);

  // Listen to browser network online event
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      performSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [performSync]);

  // Start html5-qrcode scanner
  const startCameraScanner = async () => {
    setCameraError(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrCode = new Html5Qrcode('qr-reader-container');
      setScannerInstance(html5QrCode);

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleMarkScan(decodedText);
        },
        () => {
          // Continuous scan frames without QR - ignore
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      console.warn('Camera scan init error:', err);
      setCameraError(
        err.message || 'Camera permission not granted or device camera unavailable. Use Quick Simulation buttons below!'
      );
      setIsScanning(false);
    }
  };

  const stopCameraScanner = async () => {
    if (scannerInstance) {
      try {
        await scannerInstance.stop();
        scannerInstance.clear();
      } catch (e) {
        console.error('Error stopping camera:', e);
      }
      setScannerInstance(null);
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerInstance) {
        scannerInstance.stop().catch(() => {});
      }
    };
  }, [scannerInstance]);

  // Main Attendance Scanning Handler (Local-first with offline IndexedDB fallback)
  const handleMarkScan = async (qrText: string) => {
    if (!qrText || isProcessing) return;
    setIsProcessing(true);
    const scanTimestamp = new Date().toISOString();

    // 1. Try POST /api/attendance/mark first (unless forced offline for testing)
    if (!forceOfflineMode) {
      try {
        const res = await authApi.markAttendance({
          device_id: deviceId,
          trainee_qr_code: qrText.trim(),
          session_id: sessionId,
          timestamp: scanTimestamp,
        });

        setIsOnline(true);
        setLastResponse(res);
        setRecentScans((prev) => [res, ...prev.slice(0, 19)]);

        if (soundEnabled) {
          playBuzzerTone(res.buzzer);
        }
        setIsProcessing(false);
        return;
      } catch (networkErr: any) {
        console.warn('Network failure on /api/attendance/mark. Falling back to local IndexedDB queue...', networkErr);
      }
    }

    // 2. On network failure (or forced offline mode): Store record in IndexedDB queue
    try {
      setIsOnline(false);

      await addOfflineAttendance({
        device_id: deviceId,
        trainee_qr_code: qrText.trim(),
        session_id: sessionId,
        timestamp: scanTimestamp,
      });

      await refreshQueue();

      const offlineRes: AttendanceMarkResponse = {
        status: 'OFFLINE_QUEUED',
        buzzer: 'BEEP_WARN',
        message: 'Offline - Queued: Attendance recorded locally. Queued in IndexedDB for auto-sync.',
        trainee_id: qrText.trim(),
        trainee_name: 'Queued Trainee (Offline Record)',
        check_in_time: scanTimestamp,
        synced_from: 'hardware',
      };

      setLastResponse(offlineRes);
      setRecentScans((prev) => [offlineRes, ...prev.slice(0, 19)]);

      if (soundEnabled) {
        playBuzzerTone('BEEP_WARN');
      }
    } catch (dbErr: any) {
      console.error('Failed to store scan into IndexedDB:', dbErr);
      const fatalErr: AttendanceMarkResponse = {
        status: 'INVALID',
        buzzer: 'BEEP_ERROR',
        message: `Local offline storage failed: ${dbErr.message || 'Unknown error'}`,
      };
      setLastResponse(fatalErr);
      if (soundEnabled) playBuzzerTone('BEEP_ERROR');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <Link
              href="/trainee/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'}`} />
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>NCCT Attendance Kiosk Simulator</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ESP32-S3 Node Ready
                </span>
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Webcam QR scanner, offline-first IndexedDB queue &amp; auto-sync background worker (30s interval).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                soundEnabled
                  ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                  : 'border-slate-700 bg-slate-800 text-slate-400'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? 'Buzzer Audio ON' : 'Audio Muted'}</span>
            </button>

            <Link
              href="/trainer/attendance"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>Trainer Attendance Roster</span>
            </Link>
          </div>
        </div>

        {/* Real-time Offline Sync Status & Controller Bar */}
        <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Connection Status Badge */}
            <div
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-mono font-bold transition-all ${
                isOnline
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-amber-500/50 bg-amber-500/20 text-amber-300'
              }`}
            >
              {isOnline ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />}
              <span>{isOnline ? 'ONLINE: Backend Connected' : 'OFFLINE: Backend Unreachable'}</span>
            </div>

            {/* Offline Queue Badge */}
            <button
              onClick={() => setShowQueueModal(true)}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-mono font-bold transition-all cursor-pointer ${
                queueCount > 0
                  ? 'border-amber-500 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                  : 'border-slate-800 bg-slate-900 text-slate-400'
              }`}
            >
              <Database className="w-4 h-4 text-amber-400" />
              <span>Offline Queue:</span>
              <span
                id="queue-count-badge"
                className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                  queueCount > 0 ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {queueCount} records
              </span>
            </button>

            {/* Background Sync Countdown Timer */}
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800/80">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Auto-sync in:</span>
              <span className="text-cyan-300 font-bold w-6 text-center">{secondsUntilSync}s</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            {/* Force Offline Mode Toggle for Testing */}
            <button
              id="toggle-offline-mode-btn"
              onClick={() => {
                const nextState = !forceOfflineMode;
                setForceOfflineMode(nextState);
                if (nextState) setIsOnline(false);
                else setIsOnline(true);
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                forceOfflineMode
                  ? 'border-red-500/50 bg-red-500/20 text-red-300 hover:bg-red-500/30'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
              }`}
              title="Simulate backend network outage directly in the simulator"
            >
              <CloudOff className="w-3.5 h-3.5" />
              <span>{forceOfflineMode ? 'Forced Offline Active' : 'Simulate Offline'}</span>
            </button>

            {/* Manual Sync Now Button */}
            <button
              id="sync-now-btn"
              disabled={isSyncing || (queueCount === 0 && isOnline)}
              onClick={() => performSync()}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>

        {/* Sync Toast Notification */}
        {syncToast && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs font-mono flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{syncToast}</span>
            </div>
            <button onClick={() => setSyncToast(null)} className="text-emerald-400 hover:text-white cursor-pointer">
              &times;
            </button>
          </div>
        )}

        {/* Main Grid: Left Scanner & Feedback, Right Device Settings & Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Scanner & Hardware Display (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hardware Status Terminal */}
            <div className="bg-slate-950 rounded-3xl border border-slate-800 p-6 space-y-5 shadow-2xl relative overflow-hidden">
              {/* LED Status Banner */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-400">Device:</span>
                  <span className="text-white font-bold">{deviceId}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400">Session:</span>
                  <span className="text-emerald-400 font-bold">{sessionId}</span>
                </div>
              </div>

              {/* Hardware LED / Feedback Visualizer */}
              {lastResponse ? (
                <div
                  id="scan-result-card"
                  className={`p-5 rounded-2xl border transition-all duration-300 flex items-start gap-4 ${
                    lastResponse.status === 'OK'
                      ? 'border-emerald-500/60 bg-emerald-950/40 text-emerald-200'
                      : lastResponse.status === 'OFFLINE_QUEUED'
                      ? 'border-amber-500/80 bg-amber-950/50 text-amber-200 shadow-lg shadow-amber-950/30'
                      : lastResponse.status === 'DUPLICATE'
                      ? 'border-amber-500/60 bg-amber-950/40 text-amber-200'
                      : 'border-red-500/60 bg-red-950/40 text-red-200'
                  }`}
                >
                  <div className="p-3 rounded-xl bg-slate-900/80 shrink-0">
                    {lastResponse.status === 'OK' && <CheckCircle2 className="w-8 h-8 text-emerald-400" />}
                    {lastResponse.status === 'OFFLINE_QUEUED' && <Database className="w-8 h-8 text-amber-400 animate-pulse" />}
                    {lastResponse.status === 'DUPLICATE' && <AlertTriangle className="w-8 h-8 text-amber-400" />}
                    {lastResponse.status === 'INVALID' && <XCircle className="w-8 h-8 text-red-400" />}
                  </div>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        id="scan-status-badge"
                        className={`text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          lastResponse.status === 'OK'
                            ? 'bg-emerald-500 text-slate-950'
                            : lastResponse.status === 'OFFLINE_QUEUED'
                            ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                            : lastResponse.status === 'DUPLICATE'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-red-500 text-white'
                        }`}
                      >
                        {lastResponse.status === 'OFFLINE_QUEUED' ? 'STATUS: OFFLINE - QUEUED' : `STATUS: ${lastResponse.status}`}
                      </span>

                      <span className="font-mono text-[10px] text-slate-400">
                        BUZZER: {lastResponse.buzzer}
                      </span>

                      {lastResponse.status === 'OFFLINE_QUEUED' && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-900/50 text-amber-300 border border-amber-700/50 flex items-center gap-1">
                          <Database className="w-3 h-3" /> IndexedDB Stored
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white pt-1">{lastResponse.message}</h3>

                    {lastResponse.trainee_name && (
                      <p className="text-xs text-slate-300 font-mono">
                        Trainee: <strong>{lastResponse.trainee_name}</strong> ({lastResponse.trainee_id})
                      </p>
                    )}

                    {lastResponse.check_in_time && (
                      <p className="text-[11px] text-slate-400 font-mono">
                        Time: {new Date(lastResponse.check_in_time).toLocaleTimeString()} ({new Date(lastResponse.check_in_time).toISOString().slice(0, 10)})
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 text-center space-y-1">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                    SCANNER READY • AWAITING QR CODE
                  </span>
                  <p className="text-xs text-slate-500">
                    Hold trainee QR code in front of camera or trigger a simulation button below.
                  </p>
                </div>
              )}

              {/* Webcam Viewport */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    Webcam Scanner Feed
                  </span>

                  <button
                    onClick={isScanning ? stopCameraScanner : startCameraScanner}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isScanning
                        ? 'bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                    }`}
                  >
                    {isScanning ? (
                      <>
                        <CameraOff className="w-3.5 h-3.5" />
                        <span>Stop Camera</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5" />
                        <span>Start Camera Scanner</span>
                      </>
                    )}
                  </button>
                </div>

                {/* HTML5 QR Container */}
                <div className="relative rounded-2xl bg-black border border-slate-800 overflow-hidden min-h-[240px] flex items-center justify-center">
                  <div id="qr-reader-container" className="w-full h-full max-w-sm mx-auto" />

                  {!isScanning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-2 bg-slate-950/80 backdrop-blur-2xs">
                      <Camera className="w-10 h-10 text-slate-600" />
                      <p className="text-xs text-slate-400 max-w-xs">
                        Camera scanner paused. Click "Start Camera Scanner" or use the quick simulation actions below.
                      </p>
                      {cameraError && (
                        <p className="text-[11px] text-amber-400 max-w-xs font-mono">{cameraError}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Simulation Bar */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Hardware Simulation Triggers
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    id="scan-vikram-btn"
                    disabled={isProcessing}
                    onClick={() => handleMarkScan('NCCT-TR-2026-00001')}
                    className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-bold transition-all flex flex-col items-center justify-center text-center cursor-pointer disabled:opacity-50"
                  >
                    <span>Scan Vikram Sharma</span>
                    <span className="text-[10px] font-mono text-emerald-200">NCCT-TR-2026-00001</span>
                  </button>

                  <button
                    id="scan-duplicate-btn"
                    disabled={isProcessing}
                    onClick={() => handleMarkScan('NCCT-TR-2026-00001')}
                    className="p-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-98 text-white text-xs font-bold transition-all flex flex-col items-center justify-center text-center cursor-pointer disabled:opacity-50"
                  >
                    <span>Test Duplicate Scan</span>
                    <span className="text-[10px] font-mono text-amber-200">Re-scan same trainee</span>
                  </button>

                  <button
                    id="scan-invalid-btn"
                    disabled={isProcessing}
                    onClick={() => handleMarkScan('INVALID-CODE-999')}
                    className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-98 text-white text-xs font-bold transition-all flex flex-col items-center justify-center text-center cursor-pointer disabled:opacity-50"
                  >
                    <span>Test Invalid QR Code</span>
                    <span className="text-[10px] font-mono text-red-200">Simulate unknown code</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Node Settings & Recent Scan Stream (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Device & Session Config */}
            <div className="bg-slate-950 rounded-3xl border border-slate-800 p-6 space-y-4 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Hardware Node Configuration
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400">Device ID</label>
                  <select
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="KIOSK-SIM-01">KIOSK-SIM-01 (Web Simulator)</option>
                    <option value="ESP32-S3-GATE-01">ESP32-S3-GATE-01 (Hardware)</option>
                    <option value="ESP32-S3-CLASS-02">ESP32-S3-CLASS-02 (Hardware)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400">Session ID</label>
                  <input
                    type="text"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Manual Input Bar */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[11px] font-mono text-slate-400">
                  Custom QR Code String or Trainee ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Enter Trainee ID e.g. NCCT-TR-2026-00001"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    disabled={isProcessing}
                    onClick={() => handleMarkScan(manualCode)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Scan Log Stream */}
            <div className="bg-slate-950 rounded-3xl border border-slate-800 p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  Live Attendance Stream ({recentScans.length})
                </h3>

                {recentScans.length > 0 && (
                  <button
                    onClick={() => setRecentScans([])}
                    className="text-[10px] font-mono text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    Clear Log
                  </button>
                )}
              </div>

              {recentScans.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 italic">
                  No attendance scans recorded in this session yet.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {recentScans.map((scan, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            scan.status === 'OK'
                              ? 'bg-emerald-400'
                              : scan.status === 'OFFLINE_QUEUED'
                              ? 'bg-amber-400 animate-pulse'
                              : scan.status === 'DUPLICATE'
                              ? 'bg-amber-400'
                              : 'bg-red-400'
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">
                            {scan.trainee_name || 'Unidentified'}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 truncate">
                            {scan.trainee_id || scan.message}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            scan.status === 'OK'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : scan.status === 'OFFLINE_QUEUED'
                              ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                              : scan.status === 'DUPLICATE'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {scan.status === 'OFFLINE_QUEUED' ? 'Offline - Queued' : scan.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal: View Queued Records in IndexedDB */}
        {showQueueModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">IndexedDB Offline Queue ({queuedRecords.length})</h3>
                </div>
                <button
                  onClick={() => setShowQueueModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {queuedRecords.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-mono">
                  IndexedDB offline queue is currently empty. All scans have been synced with server!
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {queuedRecords.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-300">{item.trainee_qr_code}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {item.session_id}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-slate-500">
                          Scanned at: {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300">
                        QUEUED
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                {queuedRecords.length > 0 && (
                  <button
                    onClick={async () => {
                      await clearOfflineAttendanceQueue();
                      await refreshQueue();
                    }}
                    className="text-xs text-red-400 hover:text-red-300 font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Offline Queue</span>
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => {
                      performSync();
                      setShowQueueModal(false);
                    }}
                    disabled={isSyncing || queuedRecords.length === 0}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    Sync Now ({queuedRecords.length})
                  </button>
                  <button
                    onClick={() => setShowQueueModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

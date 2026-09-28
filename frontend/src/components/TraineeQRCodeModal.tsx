'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Copy, Check, X, ShieldCheck, GraduationCap } from 'lucide-react';

interface TraineeQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  traineeId: string;
  traineeName: string;
  institution?: string;
  courseEnrolled?: string;
}

export default function TraineeQRCodeModal({
  isOpen,
  onClose,
  traineeId,
  traineeName,
  institution,
  courseEnrolled,
}: TraineeQRCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!traineeId) return;

    QRCode.toDataURL(traineeId, {
      width: 320,
      margin: 2,
      color: {
        dark: '#064e3b', // Deep emerald
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [traineeId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(traineeId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `NCCT_QR_${traineeId}.png`;
    a.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Card Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-mono font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Official NCCT Trainee Credential</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight pt-1">
            Digital ID &amp; Attendance QR
          </h2>
          <p className="text-xs text-slate-500">
            Scan at NCCT attendance kiosks or ESP32-S3 hardware scanners for instantaneous check-in.
          </p>
        </div>

        {/* QR Code Canvas Card */}
        <div className="bg-linear-to-b from-slate-50 to-slate-100/70 rounded-2xl border border-slate-200/80 p-6 flex flex-col items-center justify-center space-y-4 shadow-inner">
          <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code for ${traineeId}`}
                className="w-52 h-52 sm:w-60 sm:h-60 object-contain rounded-xl"
              />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center text-slate-400">
                Generating QR...
              </div>
            )}
          </div>

          {/* Trainee Details */}
          <div className="text-center space-y-1">
            <span className="font-mono text-sm sm:text-base font-extrabold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 block">
              {traineeId}
            </span>
            <p className="text-xs font-bold text-slate-900 pt-0.5">{traineeName}</p>
            {institution && <p className="text-[11px] text-slate-500 truncate max-w-xs">{institution}</p>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Trainee ID</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

type QRCodeDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  title: string;
  description?: string;
};

export function QRCodeDialog({ isOpen, onClose, value, title, description }: QRCodeDialogProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const svg = document.getElementById("cmm-qrcode-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `cmm-qrcode-${title.replace(/\s+/g, "-").toLowerCase()}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-2xl pointer-events-auto sm:p-8"
            >
              <button
                onClick={onClose}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
              >
                <X size={18} />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                  <Share2 size={32} />
                </div>

                <h2 className="text-2xl font-black tracking-tight text-slate-900">
                  {title}
                </h2>
                {description && (
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    {description}
                  </p>
                )}

                <div className="mt-8 flex flex-col items-center gap-6">
                  <div className="relative rounded-[2rem] border border-slate-100 bg-slate-50 p-6 shadow-inner">
                    <QRCodeSVG
                      id="cmm-qrcode-svg"
                      value={value}
                      size={200}
                      level="H"
                      includeMargin={false}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="grid w-full grid-cols-2 gap-3">
                    <button
                      onClick={handleCopy}
                      className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-bold transition-all ${copied ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                    >
                      {copied ? "✓ Copié" : "Copier le lien"}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800"
                    >
                      <Download size={16} />
                      PNG
                    </button>
                  </div>
                </div>

                <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  CleanMyMap • V1 Launch
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

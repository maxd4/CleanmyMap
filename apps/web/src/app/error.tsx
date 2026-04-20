"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { VibrantBackground } from "@/components/ui/vibrant-background";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Capture the error to Sentry if available
    Sentry.captureException(error);
    console.error("[Runtime Error]", error);
  }, [error]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 text-center overflow-hidden font-outfit">
      <VibrantBackground />
      
      <div className="relative z-10 space-y-8 max-w-2xl px-4 py-12 premium-card bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-rose-500/20 shadow-2xl rounded-[3rem]">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-full border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-16 h-16 text-rose-500" />
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-4">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            Oops ! Un imprévu <br />scientifique.
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Une erreur inattendue est survenue lors de l'exécution de l'application. Nos équipes ont été alertées via Sentry.
          </p>
          {error.digest && (
            <code className="block mt-4 text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-600 font-mono">
              Digest: {error.digest}
            </code>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-10 py-5 bg-rose-500 text-white font-black rounded-2xl hover:bg-rose-600 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-rose-500/20"
          >
            <RotateCcw size={18} />
            RÉESSAYER
          </button>
          
          <Link 
            href="/"
            className="flex items-center gap-2 px-10 py-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-lg"
          >
            <Home size={18} />
            ACCUEIL
          </Link>
        </div>
      </div>

      <p className="mt-8 text-xs text-slate-500/50 uppercase tracking-[0.3em]">
        CleanMyMap Resilience Protocol
      </p>
    </div>
  );
}

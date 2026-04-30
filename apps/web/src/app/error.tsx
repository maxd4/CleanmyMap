"use client";

import { useEffect } from"react";
import * as Sentry from"@sentry/nextjs";
import { VibrantBackground } from"@/components/ui/vibrant-background";
import { AlertCircle, RotateCcw, Home } from"lucide-react";
import Link from"next/link";

export default function Error({
 error,
 reset,
}: {
 error: Error & { digest?: string };
 reset: () => void;
}) {
 const isSentryConfigured = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

 useEffect(() => {
 if (isSentryConfigured) {
 Sentry.captureException(error);
 }
 console.error("[Runtime Error]", error);
 }, [error, isSentryConfigured]);

 return (
 <div className="relative min-h-screen flex flex-col items-center justify-center p-6 text-center overflow-hidden font-outfit">
 <VibrantBackground />
 
 <div className="relative z-10 space-y-8 w-full max-w-[42rem] px-5 py-14 sm:px-8 premium-card bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-rose-500/20 shadow-2xl rounded-[3rem]">
 {/* Error Icon */}
 <div className="flex justify-center">
 <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-full border border-rose-200 dark:border-rose-800">
 <AlertCircle className="w-16 h-16 text-rose-500" />
 </div>
 </div>

 {/* Text Content */}
 <div className="space-y-4">
 <h1 className="text-4xl font-bold tracking-tight cmm-text-primary dark:text-white leading-tight">
 Oops ! Un imprévu <br />scientifique.
 </h1>
        <p className="cmm-text-muted dark:cmm-text-muted max-w-sm mx-auto leading-relaxed">
          Une petite perturbation technique empêche l&apos;affichage de cette page. Pas d&apos;inquiétude, vos données sont en sécurité.
          {" "}
          {isSentryConfigured
            ? "Nos équipes ont été alertées et travaillent sur une résolution."
            : "N'hésitez pas à rafraîchir la page ou à revenir plus tard."}
        </p>
 {error.digest && (
 <code className="block mt-4 cmm-text-caption uppercase tracking-widest cmm-text-muted dark:cmm-text-secondary font-mono">
 Digest: {error.digest}
 </code>
 )}
 </div>

 {/* Actions */}
 <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
 <button
 onClick={() => reset()}
 className="flex items-center gap-2 px-10 py-5 bg-rose-500 text-white font-bold rounded-2xl hover:bg-rose-600 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-rose-500/20"
 >
 <RotateCcw size={18} />
 RÉESSAYER
 </button>
 
 <Link 
 href="/"
 className="flex min-w-[11.5rem] items-center justify-center gap-2 px-10 py-5 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-400 active:scale-95 transition-all shadow-xl shadow-emerald-500/25 border border-emerald-300/30"
 >
 <Home size={18} />
 ACCUEIL
 </Link>
 </div>
 </div>

 </div>
 );
}

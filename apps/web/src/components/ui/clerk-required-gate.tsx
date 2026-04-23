"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type ClerkRequiredGateProps = {
  isAuthenticated: boolean;
  title: string;
  description: string;
  mode?: "blur" | "disabled";
  signInHref?: string;
  signInLabel?: string;
  badge?: string;
  lockedPreview?: ReactNode;
  children: ReactNode;
};

export function ClerkRequiredGate({
  isAuthenticated,
  title,
  description,
  mode = "blur",
  signInHref = "/sign-in",
  signInLabel = "Se connecter",
  badge = "Connexion requise",
  lockedPreview,
  children,
}: ClerkRequiredGateProps) {
  if (isAuthenticated) {
    return children;
  }

  if (mode === "disabled") {
    return (
      <section className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
            {badge}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {title}
          </h2>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href={signInHref}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              {signInLabel}
            </Link>
          </div>
        </div>
        <div aria-hidden="true" className="pointer-events-none select-none opacity-60">
          {children}
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div aria-hidden="true" className="pointer-events-none select-none blur-sm opacity-55">
        {lockedPreview ?? children}
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-white/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
            {badge}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {title}
          </h2>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href={signInHref}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              {signInLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

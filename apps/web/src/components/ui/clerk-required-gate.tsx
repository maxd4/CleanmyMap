"use client";

import type { ReactNode } from"react";
import { Lock } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import {
 SystemStateAction,
 SystemStateDescription,
 SystemStateIcon,
 SystemStateLayout,
 SystemStateMeta,
 SystemStateTitle,
} from "@/components/ui/system-state";

type ClerkRequiredGateProps = {
 isAuthenticated: boolean;
 title: string;
 description: string;
 mode?:"blur" |"disabled";
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
 mode ="blur",
 signInHref ="/sign-in",
 signInLabel ="Se connecter",
 badge ="Connexion requise",
 lockedPreview,
 children,
}: ClerkRequiredGateProps) {
 if (isAuthenticated) {
 return children;
 }

 if (mode ==="disabled") {
 return (
 <section className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
 <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
 <p className="cmm-text-caption font-bold uppercase tracking-[0.2em] text-emerald-700">
 {badge}
 </p>
 <h2 className="mt-2 text-2xl font-bold tracking-tight cmm-text-primary">
 {title}
 </h2>
 <p className="mt-2 cmm-text-small cmm-text-secondary">{description}</p>
 <div className="mt-5 flex flex-wrap justify-center gap-3">
 <CmmButton href={signInHref} tone="primary">
 {signInLabel}
 </CmmButton>
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

 <div className="absolute inset-0 flex items-center justify-center bg-white/54 p-4 backdrop-blur-sm">
 <SystemStateLayout variant="forbidden" className="relative z-10 w-full max-w-xl">
 <SystemStateIcon variant="forbidden">
 <Lock className="h-7 w-7" />
 </SystemStateIcon>
 <SystemStateMeta variant="forbidden" label={badge}>
 L&apos;accès est réservé aux comptes autorisés.
 </SystemStateMeta>
 <SystemStateTitle variant="forbidden">{title}</SystemStateTitle>
 <SystemStateDescription variant="forbidden">
 {description}
 </SystemStateDescription>
 <SystemStateAction>
 <CmmButton href={signInHref} tone="primary">
 {signInLabel}
 </CmmButton>
 </SystemStateAction>
 </SystemStateLayout>
 </div>
 </section>
 );
}

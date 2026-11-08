"use client";

import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { CmmPopover } from "@/components/ui/cmm-popover";

export function SpogomiActionInfo({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <CmmPopover
      id={id}
      ariaLabel={`Informations sur ${label}`}
      panelAlignment="start"
      panelClassName="w-[min(28rem,calc(100vw-1rem))] rounded-2xl border border-sky-200 bg-white p-4 text-slate-900 shadow-xl"
      wrapperClassName="shrink-0"
      openOnHover
      renderTrigger={(triggerProps) => (
        <button
          {...triggerProps}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-800 transition-colors hover:border-sky-400 hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2"
          aria-label={`Informations sur ${label}`}
        >
          <Info size={18} aria-hidden="true" />
        </button>
      )}
    >
      <div className="space-y-3">
        <p className="text-base font-black text-slate-950">Informations sur {label}</p>
        {children}
      </div>
    </CmmPopover>
  );
}

"use client";

import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { CmmPopover } from "@/components/ui/cmm-popover";
import { CmmIcon } from "@/components/ui/cmm-icon";

export function SpogomiActionInfo({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  const titleId = `${id}-title`;
  return (
    <CmmPopover
      id={id}
      ariaLabel={`Informations sur ${label}`}
      ariaLabelledBy={titleId}
      panelAlignment="start"
      panelClassName="w-[min(28rem,calc(100vw-1rem))] rounded-2xl border border-sky-200 bg-white p-4 text-sm leading-6 text-slate-900 shadow-xl"
      wrapperClassName="shrink-0"
      openOnHover
      renderTrigger={(triggerProps) => (
        <button
          {...triggerProps}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-800 transition-colors hover:border-sky-400 hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2"
          aria-label={`Informations sur ${label}`}
        >
          <CmmIcon icon={Info} size="sm" />
        </button>
      )}
    >
      <div className="space-y-3">
        <h3 id={titleId} className="text-base font-black leading-6 text-slate-950">{label}</h3>
        {children}
      </div>
    </CmmPopover>
  );
}

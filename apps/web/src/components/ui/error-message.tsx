"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Info, Lock, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppErrorKind } from "@/lib/errors/app-errors";

type ErrorMessageProps = {
  kind?: AppErrorKind;
  title?: ReactNode;
  message: ReactNode;
  actions?: ReactNode;
  className?: string;
  dense?: boolean;
};

const toneClasses: Record<AppErrorKind, string> = {
  validation: "border-amber-200 bg-amber-50 text-amber-950",
  network: "border-cyan-200 bg-cyan-50 text-cyan-950",
  server: "border-rose-200 bg-rose-50 text-rose-950",
  permission: "border-violet-200 bg-violet-50 text-violet-950",
};

function kindIcon(kind: AppErrorKind) {
  switch (kind) {
    case "validation":
      return <Info className="h-4 w-4" />;
    case "network":
      return <WifiOff className="h-4 w-4" />;
    case "permission":
      return <Lock className="h-4 w-4" />;
    case "server":
    default:
      return <AlertTriangle className="h-4 w-4" />;
  }
}

export function ErrorMessage({
  kind = "server",
  title,
  message,
  actions,
  className,
  dense = false,
}: ErrorMessageProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "rounded-2xl border px-4 py-3 shadow-sm",
        toneClasses[kind],
        dense && "px-3 py-2",
        className,
      )}
    >
      <div className="flex gap-3">
        <div className="mt-0.5 shrink-0">{kindIcon(kind)}</div>
        <div className="min-w-0 flex-1">
          {title ? (
            <p className={cn("font-semibold", dense ? "text-sm" : "text-base")}>{title}</p>
          ) : null}
          <p className={cn("whitespace-pre-line", dense ? "text-xs" : "text-sm")}>{message}</p>
          {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}

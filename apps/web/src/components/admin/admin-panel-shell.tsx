"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminPanelShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  footer?: ReactNode;
}

/**
 * Standardized Shell for Admin Dashboard Panels.
 * Goal: Software sobriety through code reuse and consistent UI.
 */
export function AdminPanelShell({
  title,
  subtitle,
  children,
  className,
  headerAction,
  footer,
}: AdminPanelShellProps) {
  return (
    <section
      className={cn(
        "group relative overflow-hidden rounded-[3rem] border border-white/5 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-3xl transition-all hover:bg-white/5",
        className
      )}
    >
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tighter text-white leading-none">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm font-medium text-slate-400 opacity-80 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && (
            <div className="shrink-0">
              {headerAction}
            </div>
          )}
        </div>

        <div className="flex-1">
          {children}
        </div>

        {footer && (
          <div className="mt-8 pt-6 border-t border-white/5">
            {footer}
          </div>
        )}
      </div>
    </section>
  );
}

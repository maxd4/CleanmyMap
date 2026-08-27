"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminPanelShellProps {
  title: string;
  subtitle?: string;
  variant?: "dark" | "warm";
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
  variant = "dark",
  children,
  className,
  headerAction,
  footer,
}: AdminPanelShellProps) {
  return (
    <section
      className={cn(
        variant === "warm"
          ? "group relative overflow-hidden rounded-[1.75rem] border border-stone-200/80 bg-white/78 p-5 shadow-[0_16px_40px_-32px_rgba(69,45,28,0.24)] backdrop-blur-sm transition-shadow hover:shadow-[0_18px_42px_-30px_rgba(69,45,28,0.28)]"
          : "group relative overflow-hidden rounded-[3rem] border border-white/5 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-3xl transition-all hover:bg-white/5",
        className,
      )}
    >
      <div className="relative z-10 flex flex-col h-full">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2
              className={cn(
                "text-2xl font-black tracking-tighter leading-none",
                variant === "warm" ? "text-stone-950" : "text-white",
              )}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                className={cn(
                  "text-sm font-medium leading-relaxed",
                  variant === "warm"
                    ? "text-stone-600"
                    : "text-slate-400 opacity-80",
                )}
              >
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
          <div
            className={cn(
              "mt-8 border-t pt-6",
              variant === "warm" ? "border-stone-200" : "border-white/5",
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </section>
  );
}

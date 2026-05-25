import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SystemStateVariant =
  | "error"
  | "warning"
  | "empty"
  | "loading"
  | "forbidden"
  | "offline";

type SystemStateStyle = {
  shell: string;
  icon: string;
  title: string;
  description: string;
  meta: string;
  metaLabel: string;
};

const SYSTEM_STATE_STYLES: Record<SystemStateVariant, SystemStateStyle> = {
  error: {
    shell:
      "border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,248,248,0.96)_0%,rgba(255,242,242,0.94)_100%)] shadow-[0_28px_80px_-52px_rgba(225,29,72,0.34)]",
    icon: "border-rose-200 bg-rose-100 text-rose-700 shadow-[0_16px_32px_-24px_rgba(225,29,72,0.30)]",
    title: "text-slate-950",
    description: "text-slate-600",
    meta: "border-rose-200/70 bg-white/76 text-slate-700",
    metaLabel: "text-rose-800",
  },
  warning: {
    shell:
      "border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,252,244,0.96)_0%,rgba(255,247,237,0.94)_100%)] shadow-[0_28px_80px_-52px_rgba(180,83,9,0.32)]",
    icon: "border-amber-200 bg-amber-100 text-amber-700 shadow-[0_16px_32px_-24px_rgba(180,83,9,0.28)]",
    title: "text-slate-950",
    description: "text-slate-600",
    meta: "border-amber-200/70 bg-white/76 text-slate-700",
    metaLabel: "text-amber-800",
  },
  empty: {
    shell:
      "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.94)_100%)] shadow-[0_28px_80px_-52px_rgba(71,85,105,0.18)]",
    icon: "border-slate-200 bg-slate-100 text-slate-600 shadow-[0_16px_32px_-24px_rgba(71,85,105,0.18)]",
    title: "text-slate-950",
    description: "text-slate-600",
    meta: "border-slate-200/70 bg-white/76 text-slate-700",
    metaLabel: "text-slate-600",
  },
  loading: {
    shell:
      "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.94)_100%)] shadow-[0_28px_80px_-52px_rgba(71,85,105,0.18)]",
    icon: "border-slate-200 bg-slate-100 text-slate-500 shadow-[0_16px_32px_-24px_rgba(71,85,105,0.18)]",
    title: "text-slate-950",
    description: "text-slate-600",
    meta: "border-slate-200/70 bg-white/76 text-slate-700",
    metaLabel: "text-slate-600",
  },
  forbidden: {
    shell:
      "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,252,247,0.96)_0%,rgba(248,250,252,0.94)_100%)] shadow-[0_28px_80px_-52px_rgba(180,83,9,0.20)]",
    icon: "border-slate-200 bg-[linear-gradient(135deg,rgba(254,249,195,0.96)_0%,rgba(254,242,242,0.96)_100%)] text-slate-700 shadow-[0_16px_32px_-24px_rgba(180,83,9,0.20)]",
    title: "text-slate-950",
    description: "text-slate-600",
    meta: "border-slate-200/70 bg-white/76 text-slate-700",
    metaLabel: "text-slate-600",
  },
  offline: {
    shell:
      "border-cyan-200/80 bg-[linear-gradient(180deg,rgba(248,253,255,0.96)_0%,rgba(240,249,255,0.94)_100%)] shadow-[0_28px_80px_-52px_rgba(14,165,233,0.24)]",
    icon: "border-cyan-200 bg-cyan-100 text-cyan-700 shadow-[0_16px_32px_-24px_rgba(14,165,233,0.26)]",
    title: "text-slate-950",
    description: "text-slate-600",
    meta: "border-cyan-200/70 bg-white/76 text-slate-700",
    metaLabel: "text-cyan-800",
  },
};

type SystemStateLayoutProps = {
  variant?: SystemStateVariant;
  className?: string;
  children: ReactNode;
};

export function SystemStateLayout({
  variant = "warning",
  className,
  children,
}: SystemStateLayoutProps) {
  const styles = SYSTEM_STATE_STYLES[variant];

  return (
    <div className={cn("w-full max-w-2xl", className)}>
      <div className={cn("overflow-hidden rounded-[32px] border backdrop-blur-md", styles.shell)}>
        <div className="flex flex-col items-center gap-5 px-5 py-8 text-center sm:px-8 sm:py-10">
          {children}
        </div>
      </div>
    </div>
  );
}

type SystemStateIconProps = {
  variant?: SystemStateVariant;
  className?: string;
  children: ReactNode;
};

export function SystemStateIcon({ variant, className, children }: SystemStateIconProps) {
  const styles = SYSTEM_STATE_STYLES[variant ?? "warning"];

  return (
    <div
      className={cn(
        "flex h-16 w-16 items-center justify-center rounded-2xl border",
        styles.icon,
        className,
      )}
    >
      {children}
    </div>
  );
}

type SystemStateTitleProps = {
  variant?: SystemStateVariant;
  className?: string;
  children: ReactNode;
};

export function SystemStateTitle({ variant, className, children }: SystemStateTitleProps) {
  const styles = SYSTEM_STATE_STYLES[variant ?? "warning"];

  return (
    <h1 className={cn("text-balance text-2xl font-semibold tracking-tight sm:text-3xl", styles.title, className)}>
      {children}
    </h1>
  );
}

type SystemStateDescriptionProps = {
  variant?: SystemStateVariant;
  className?: string;
  children: ReactNode;
};

export function SystemStateDescription({
  variant,
  className,
  children,
}: SystemStateDescriptionProps) {
  const styles = SYSTEM_STATE_STYLES[variant ?? "warning"];

  return (
    <p className={cn("max-w-prose text-pretty text-sm leading-7 sm:text-base", styles.description, className)}>
      {children}
    </p>
  );
}

type SystemStateMetaProps = {
  variant?: SystemStateVariant;
  label?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function SystemStateMeta({ variant, label, className, children }: SystemStateMetaProps) {
  const styles = SYSTEM_STATE_STYLES[variant ?? "warning"];

  return (
    <div className={cn("w-full rounded-2xl border px-4 py-4 text-left sm:px-5", styles.meta, className)}>
      {label ? (
        <p className={cn("text-[0.72rem] font-semibold uppercase tracking-[0.22em]", styles.metaLabel)}>
          {label}
        </p>
      ) : null}
      <div className={cn(label ? "mt-2" : undefined, "text-sm leading-6 sm:text-[0.95rem]")}>{children}</div>
    </div>
  );
}

type SystemStateActionProps = {
  className?: string;
  children: ReactNode;
};

export function SystemStateAction({ className, children }: SystemStateActionProps) {
  return <div className={cn("flex flex-wrap items-center justify-center gap-3", className)}>{children}</div>;
}

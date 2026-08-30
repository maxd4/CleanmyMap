import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SystemStateVariant =
  | "error"
  | "warning"
  | "empty"
  | "loading"
  | "forbidden"
  | "offline";

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
  return (
    <div className={cn("cmm-system-state", className)} data-state-variant={variant}>
      <div className="cmm-system-state-shell">
        <div className="cmm-system-state-content">{children}</div>
      </div>
    </div>
  );
}

type SystemStateIconProps = {
  variant?: SystemStateVariant;
  className?: string;
  children: ReactNode;
};

export function SystemStateIcon({ variant = "warning", className, children }: SystemStateIconProps) {
  return (
    <div
      className={cn("cmm-system-state-icon", className)}
      data-state-variant={variant}
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

export function SystemStateTitle({ variant = "warning", className, children }: SystemStateTitleProps) {
  return (
    <h1
      className={cn("cmm-page-header-title cmm-system-state-title text-balance", className)}
      data-state-variant={variant}
    >
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
  variant = "warning",
  className,
  children,
}: SystemStateDescriptionProps) {
  return (
    <p
      className={cn("cmm-page-header-subtitle cmm-system-state-description text-pretty", className)}
      data-state-variant={variant}
    >
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

export function SystemStateMeta({
  variant = "warning",
  label,
  className,
  children,
}: SystemStateMetaProps) {
  return (
    <div
      className={cn("cmm-system-state-meta", className)}
      data-state-variant={variant}
    >
      {label ? <p className="cmm-system-state-meta-label">{label}</p> : null}
      <div className="cmm-system-state-meta-content">{children}</div>
    </div>
  );
}

type SystemStateActionProps = {
  className?: string;
  children: ReactNode;
};

export function SystemStateAction({ className, children }: SystemStateActionProps) {
  return <div className={cn("cmm-system-state-action", className)}>{children}</div>;
}

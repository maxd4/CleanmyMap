"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { cn } from "@/lib/utils";

export type AccountSetupSectionProps = {
  title: string;
  description: ReactNode;
  headingAside?: ReactNode;
  headingId: string;
  variant?: "dark" | "light";
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
};

export function AccountSetupSection({
  title,
  description,
  headingAside,
  headingId,
  variant = "dark",
  ariaLabel = title,
  className,
  children,
}: AccountSetupSectionProps) {
  return (
    <CmmCard
      as="section"
      variant="outlined"
      tone="slate"
      ariaLabel={ariaLabel}
      className={cn(
        variant === "dark"
          ? "cmm-account-setup-card border-slate-300/30 !bg-slate-900/90 !text-white shadow-none"
          : "cmm-account-setup-card border-slate-200 !bg-white !text-slate-900 shadow-sm",
        className,
      )}
    >
      <div className="cmm-account-setup-card-heading">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <h2 id={headingId} className="cmm-account-setup-section-title font-bold">
            {title}
          </h2>
          {headingAside}
        </div>
        <p className={cn(
          "mt-1 text-sm",
          variant === "dark" ? "cmm-text-inverse" : "cmm-text-primary",
        )}>{description}</p>
      </div>
      {children}
    </CmmCard>
  );
}

type AccountSetupChoiceInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  type: "radio" | "checkbox";
};

export type AccountSetupChoiceCardProps = {
  selected: boolean;
  icon: LucideIcon | ReactNode;
  label: ReactNode;
  description?: ReactNode;
  iconContainer?: boolean;
  variant?: "dark" | "light";
  input: AccountSetupChoiceInputProps;
  className?: string;
};

function isLucideIcon(icon: LucideIcon | ReactNode): icon is LucideIcon {
  return typeof icon === "object" && icon !== null && "render" in icon;
}

function renderChoiceIcon(icon: LucideIcon | ReactNode): ReactNode {
  if (isLucideIcon(icon)) {
    const Icon = icon as unknown as LucideIcon;
    return <Icon className="cmm-account-setup-choice-glyph" aria-hidden="true" />;
  }

  return icon as ReactNode;
}

export function AccountSetupChoiceCard({
  selected,
  icon,
  label,
  description,
  iconContainer = false,
  variant = "dark",
  input,
  className,
}: AccountSetupChoiceCardProps) {
  const { className: inputClassName, ...inputProps } = input;

  return (
    <label
      className={cn(
        "cmm-account-setup-choice relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border text-center transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-violet-300 focus-within:ring-offset-2",
        variant === "dark"
          ? selected
            ? "border-violet-300 bg-white text-violet-700 shadow-sm"
            : "border-slate-300/35 bg-slate-800/75 text-white hover:border-slate-200/70 hover:bg-slate-700/80"
          : selected
            ? "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm"
            : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
        className,
      )}
    >
      <input {...inputProps} className={cn("sr-only", inputClassName)} />
      {selected ? (
        <span className={cn(
          "absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-white",
          variant === "dark" ? "bg-violet-500" : "bg-emerald-600",
        )}>
          <Check className="h-4 w-4" aria-hidden="true" />
        </span>
      ) : null}
      {iconContainer ? (
        <span
          className={cn(
            "cmm-account-setup-choice-icon flex items-center justify-center rounded-2xl border",
              variant === "dark"
                ? selected
                  ? "border-violet-200 bg-violet-50 text-violet-600"
                  : "border-slate-300/30 bg-slate-700/40 text-slate-100"
                : selected
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-700",
          )}
        >
          {renderChoiceIcon(icon)}
        </span>
      ) : renderChoiceIcon(icon)}
      <span className="text-sm font-bold leading-tight sm:text-base">{label}</span>
      {description ? <span className="text-xs leading-4 opacity-80">{description}</span> : null}
    </label>
  );
}

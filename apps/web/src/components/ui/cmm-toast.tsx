import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type CmmToastTone = "neutral" | "info" | "success" | "warning" | "error";
export type CmmToastAnnouncement = "polite" | "assertive" | "none";

export interface CmmToastProps {
  title?: ReactNode;
  children?: ReactNode;
  message?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  tone?: CmmToastTone;
  announcement?: CmmToastAnnouncement;
  className?: string;
  iconClassName?: string;
}

/**
 * Shell présentational pour une notification temporaire.
 *
 * Le lifecycle, les effets de bord et le placement appartiennent au host
 * métier qui compose cette primitive.
 */
export function CmmToast({
  title,
  children,
  message,
  icon,
  actions,
  onClose,
  closeLabel = "Fermer la notification",
  tone = "neutral",
  announcement = "polite",
  className,
  iconClassName,
}: CmmToastProps) {
  const content = children ?? message;
  const role = announcement === "polite"
    ? "status"
    : announcement === "assertive"
      ? "alert"
      : undefined;

  return (
    <div
      className={cn("cmm-toast", className)}
      data-toast-tone={tone}
      role={role}
    >
      {icon ? (
        <div className={cn("cmm-toast__icon", iconClassName)} aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <div className="cmm-toast__content">
        {title !== undefined && title !== null ? (
          <p className="cmm-toast__title cmm-text-caption">{title}</p>
        ) : null}
        {content !== undefined && content !== null ? (
          <div className="cmm-toast__message cmm-text-small">{content}</div>
        ) : null}
        {actions ? <div className="cmm-toast__actions">{actions}</div> : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="cmm-toast__close"
          aria-label={closeLabel}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CmmFeedbackTone = "info" | "success" | "warning" | "error";

export type CmmFeedbackProps = {
  tone?: CmmFeedbackTone;
  title?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function CmmFeedback({
  tone = "info",
  title,
  children,
  action,
  className,
}: CmmFeedbackProps) {
  const role = tone === "error" || tone === "warning" ? "alert" : "status";

  return (
    <div className={cn("cmm-feedback", className)} data-feedback-tone={tone} role={role}>
      {title ? <p className="cmm-feedback-title">{title}</p> : null}
      <div className="cmm-feedback-content">{children}</div>
      {action ? <div className="cmm-feedback-action">{action}</div> : null}
    </div>
  );
}

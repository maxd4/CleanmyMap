import { useEffect } from "react";
import type { ValidationIssue } from "../model";
import {
  ACTION_VALIDATION_FIELD_IDS,
  getActionValidationFieldErrorId,
  getActionValidationTargetId,
} from "../action-declaration-form.model";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[href]",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

function resolveValidationFocusTarget(targetId: string): HTMLElement | null {
  const target = document.getElementById(targetId);
  if (target?.matches(FOCUSABLE_SELECTOR)) return target;
  return target?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
    target?.querySelector<HTMLElement>("summary") ??
    null;
}

export function useActionDeclarationFormPresentation({
  validationIssues,
  hasAttemptedSubmit,
  initialActionId,
  loadedActionPhase,
}: {
  validationIssues: ValidationIssue[];
  hasAttemptedSubmit: boolean;
  initialActionId?: string | null;
  loadedActionPhase?: string | null;
}) {
  useEffect(() => {
    if (!hasAttemptedSubmit || validationIssues.length === 0) return;
    let frame = 0;
    frame = window.requestAnimationFrame(() => {
      const issue = validationIssues[0];
      const targetId = ACTION_VALIDATION_FIELD_IDS[issue?.field ?? ""];
      if (!targetId) return;
      const focusTarget = resolveValidationFocusTarget(targetId);
      if (focusTarget instanceof HTMLElement) focusTarget.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hasAttemptedSubmit, validationIssues]);

  useEffect(() => {
    if (!hasAttemptedSubmit || validationIssues.length === 0) return;
    const previousAttributes = new Map<HTMLElement, {
      ariaDescribedBy: string | null;
      ariaInvalid: string | null;
    }>();

    for (const issue of validationIssues) {
      const targetId = getActionValidationTargetId(issue.field);
      if (!targetId) continue;
      const target = resolveValidationFocusTarget(targetId);
      if (!(target instanceof HTMLElement)) continue;
      if (!previousAttributes.has(target)) {
        previousAttributes.set(target, {
          ariaDescribedBy: target.getAttribute("aria-describedby"),
          ariaInvalid: target.getAttribute("aria-invalid"),
        });
      }
      const errorId = getActionValidationFieldErrorId(issue.field);
      const describedBy = (target.getAttribute("aria-describedby") ?? "")
        .split(/\s+/)
        .filter(Boolean);
      if (!describedBy.includes(errorId)) {
        target.setAttribute("aria-describedby", [...describedBy, errorId].join(" "));
      }
      target.setAttribute("aria-invalid", "true");
    }

    return () => {
      for (const [target, attributes] of previousAttributes) {
        if (attributes.ariaDescribedBy === null) target.removeAttribute("aria-describedby");
        else target.setAttribute("aria-describedby", attributes.ariaDescribedBy);
        if (attributes.ariaInvalid === null) target.removeAttribute("aria-invalid");
        else target.setAttribute("aria-invalid", attributes.ariaInvalid);
      }
    };
  }, [hasAttemptedSubmit, validationIssues]);

  return {
    showPreparationSummary: Boolean(initialActionId || loadedActionPhase),
  };
}

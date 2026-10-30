import { useEffect, useState } from "react";
import type { ActionDrawing, ActionPhotoAsset } from "@/lib/actions/types";
import type { FormState, ValidationIssue } from "../model";
import {
  ACTION_VALIDATION_FIELD_IDS,
  getActionDeclarationDisclosureAttention,
  getActionDeclarationDisclosureSummaries,
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
  form,
  photoAssets,
  manualDrawing,
  validationIssues,
  hasAttemptedSubmit,
  initialActionId,
  loadedActionPhase,
}: {
  form: FormState;
  photoAssets: ActionPhotoAsset[];
  manualDrawing: ActionDrawing | null;
  validationIssues: ValidationIssue[];
  hasAttemptedSubmit: boolean;
  initialActionId?: string | null;
  loadedActionPhase?: string | null;
}) {
  const [openOrganizationDetails, setOpenOrganizationDetails] = useState(false);
  const [openCollectionDetails, setOpenCollectionDetails] = useState(false);
  const [openPhotoDetails, setOpenPhotoDetails] = useState(false);
  const [openRouteDetails, setOpenRouteDetails] = useState(false);
  const [openTimeDetails, setOpenTimeDetails] = useState(false);
  const attention = getActionDeclarationDisclosureAttention({ form, validationIssues });
  const summaries = getActionDeclarationDisclosureSummaries({
    form,
    photoAssets,
    manualDrawing,
  });

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
  }, [hasAttemptedSubmit, validationIssues, openOrganizationDetails, openCollectionDetails, openPhotoDetails, openRouteDetails, openTimeDetails]);

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
  }, [hasAttemptedSubmit, validationIssues, openOrganizationDetails, openCollectionDetails, openPhotoDetails, openRouteDetails, openTimeDetails]);

  // Opening a disclosure in response to validation is intentional: it reveals the invalid field.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (attention.organization) setOpenOrganizationDetails(true);
    if (attention.collection) setOpenCollectionDetails(true);
    if (attention.route) setOpenRouteDetails(true);
    if (attention.time) setOpenTimeDetails(true);
  }, [attention.collection, attention.organization, attention.route, attention.time]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return {
    showPreparationSummary: Boolean(initialActionId || loadedActionPhase),
    summaries,
    disclosures: {
      organization: { open: openOrganizationDetails, onToggle: setOpenOrganizationDetails },
      collection: { open: openCollectionDetails, onToggle: setOpenCollectionDetails },
      photo: { open: openPhotoDetails, onToggle: setOpenPhotoDetails },
      route: { open: openRouteDetails, onToggle: setOpenRouteDetails },
      time: { open: openTimeDetails, onToggle: setOpenTimeDetails },
    },
  };
}

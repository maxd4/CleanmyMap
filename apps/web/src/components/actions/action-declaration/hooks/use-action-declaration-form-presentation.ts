import { useEffect, useState } from "react";
import type { ActionDrawing, ActionPhotoAsset, ActionVisionEstimate } from "@/lib/actions/types";
import type { FormState, ValidationIssue } from "../model";
import {
  ACTION_VALIDATION_FIELD_IDS,
  getActionDeclarationDisclosureAttention,
  getActionDeclarationDisclosureSummaries,
} from "../action-declaration-form.model";

export function useActionDeclarationFormPresentation({
  form,
  photoAssets,
  visionEstimate,
  manualDrawing,
  validationIssues,
  hasAttemptedSubmit,
  initialActionId,
  loadedActionPhase,
}: {
  form: FormState;
  photoAssets: ActionPhotoAsset[];
  visionEstimate: ActionVisionEstimate | null;
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
    visionEstimate,
    manualDrawing,
  });

  useEffect(() => {
    if (!hasAttemptedSubmit || validationIssues.length === 0) return;
    let frame = 0;
    frame = window.requestAnimationFrame(() => {
      const issue = validationIssues[0];
      const targetId = ACTION_VALIDATION_FIELD_IDS[issue?.field ?? ""];
      if (!targetId) return;
      const target = document.getElementById(targetId);
      const focusTarget = target ?? document.querySelector(`#${targetId} summary`);
      if (focusTarget instanceof HTMLElement) focusTarget.focus();
    });
    return () => window.cancelAnimationFrame(frame);
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

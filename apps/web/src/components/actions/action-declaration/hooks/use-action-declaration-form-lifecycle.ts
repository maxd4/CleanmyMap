import { useCallback, useMemo, useState } from "react";
import type {
  ActionDrawing,
  ActionGeometrySource,
} from "@/lib/actions/types";
import {
  createInitialFormState,
} from "../payload";
import type { FormState } from "../model";
import type { ActionManualInvitationStatusRecord, ActionRegistrationProjectionRecord } from "@/lib/actions/participation/registration-records";
import { useActionDeclarationHydration } from "./use-action-declaration-hydration";
import { useActionDeclarationDraft } from "./use-action-declaration-draft";

type ActionDeclarationFormLifecycleParams = {
  defaultActorName: string;
  actorNameOptions: string[];
  userId: string;
  initialActionId?: string | null;
  initialRecordType: "action";
  onBusinessDataChange?: () => void;
};

export function useActionDeclarationFormLifecycle({
  defaultActorName,
  actorNameOptions,
  userId,
  initialActionId,
  initialRecordType,
  onBusinessDataChange,
}: ActionDeclarationFormLifecycleParams) {
  const resolvedDefaultActorName = actorNameOptions.includes(defaultActorName)
    ? defaultActorName
    : (actorNameOptions[0] ?? userId);
  const createCleanForm = useMemo(
    () => () => createInitialFormState(resolvedDefaultActorName, initialRecordType),
    [initialRecordType, resolvedDefaultActorName],
  );
  const [form, setForm] = useState<FormState>(() => createCleanForm());
  const [manualDrawingState, setManualDrawingState] = useState<ActionDrawing | null>(null);
  const [manualDrawingSourceState, setManualDrawingSourceState] = useState<ActionGeometrySource | null>(null);
  const [persistedDrawing, setPersistedDrawing] = useState<ActionDrawing | null>(null);
  const [persistedDrawingSource, setPersistedDrawingSource] = useState<ActionGeometrySource | null>(null);
  const [manualInvitationStatuses, setManualInvitationStatuses] = useState<ActionManualInvitationStatusRecord[]>([]);
  const [registrationStatuses, setRegistrationStatuses] = useState<ActionRegistrationProjectionRecord[]>([]);
  const [confirmedParticipantAccounts, setConfirmedParticipantAccounts] = useState<string[]>([]);
  const [gpxError, setGpxError] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState<boolean>(false);
  const [manualDrawingEnabled] = useState<boolean>(true);

  const setManualDrawing = useCallback((
    drawing: ActionDrawing | null,
    geometrySource?: ActionGeometrySource | null,
  ) => {
    setManualDrawingState(drawing);
    setManualDrawingSourceState(drawing ? geometrySource ?? "manual" : null);
  }, []);

  const hydration = useActionDeclarationHydration({
    initialActionId,
    createCleanForm,
    setForm,
    setManualDrawingState,
    setManualDrawingSource: setManualDrawingSourceState,
    setPersistedDrawing,
    setPersistedDrawingSource,
    setManualInvitationStatuses,
    setRegistrationStatuses,
    setConfirmedParticipantAccounts,
  });
  const draft = useActionDeclarationDraft({
    initialActionId,
    createCleanForm,
    setForm,
    setManualDrawingState,
    setManualDrawingSource: setManualDrawingSourceState,
    setHasAttemptedSubmit,
    onBusinessDataChange,
  });

  return {
    form,
    setForm,
    resolvedDefaultActorName,
    manualDrawingEnabled,
    manualDrawing: manualDrawingState,
    manualDrawingSource: manualDrawingSourceState,
    persistedDrawing,
    persistedDrawingSource,
    manualInvitationStatuses,
    setManualInvitationStatuses,
    registrationStatuses,
    setRegistrationStatuses,
    confirmedParticipantAccounts,
    setConfirmedParticipantAccounts,
    setPersistedDrawing,
    setPersistedDrawingSource,
    setManualDrawingState,
    setManualDrawingSource: setManualDrawingSourceState,
    setManualDrawing,
    gpxError,
    setGpxError,
    hasAttemptedSubmit,
    setHasAttemptedSubmit,
    hydration,
    draft,
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AttendanceRegistryHttpError,
  fetchAttendanceRegistry,
  mutateAttendanceRegistry,
  type AttendanceRegistryMutationRequest,
  type AttendanceRegistrySnapshot,
} from "@/lib/actions/participation/attendance-registry-http";

type LoadState = "loading" | "ready" | "error" | "forbidden";

function describeMutationError(error: unknown): string {
  if (error instanceof AttendanceRegistryHttpError && error.status === 409) {
    return error.message || "Le registre a changé pendant cette opération. La liste a été actualisée ; vérifiez la ligne avant de réessayer.";
  }
  if (error instanceof AttendanceRegistryHttpError && (error.status === 401 || error.status === 403)) {
    return "Votre accès au registre a été retiré.";
  }
  return "La sauvegarde a échoué. Vos saisies sont conservées ; vous pouvez réessayer.";
}

export function useActionAttendanceRegistry(actionId: string) {
  const [snapshot, setSnapshot] = useState<AttendanceRegistrySnapshot | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const requestKeys = useRef(new Map<string, string>());
  const loadSequence = useRef(0);

  const refresh = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoadState("loading");
    try {
      const next = await fetchAttendanceRegistry(actionId);
      if (sequence !== loadSequence.current) return;
      setSnapshot(next);
      setLoadState("ready");
      setErrorMessage(null);
    } catch (error) {
      if (sequence !== loadSequence.current) return;
      if (error instanceof AttendanceRegistryHttpError && (error.status === 401 || error.status === 403)) {
        setLoadState("forbidden");
        setSnapshot(null);
        setErrorMessage(null);
        return;
      }
      setLoadState("error");
      setErrorMessage("Le registre n’a pas pu être chargé. Réessayez.");
    }
  }, [actionId]);

  useEffect(() => {
    requestKeys.current.clear();
    void Promise.resolve().then(refresh);
    return () => { loadSequence.current += 1; };
  }, [refresh]);

  const mutate = useCallback(async (
    mutation: Omit<AttendanceRegistryMutationRequest, "requestId">,
  ) => {
    const key = JSON.stringify([
      actionId,
      mutation.operation,
      mutation.entryId ?? null,
      mutation.expectedRevision ?? null,
      mutation.displayLabel?.trim() ?? null,
      mutation.clerkUserId ?? null,
      mutation.attendanceStatus ?? null,
      mutation.teamId ?? null,
      mutation.targetTeamId ?? null,
      mutation.expectedRevisions ?? null,
      mutation.teamName?.trim() ?? null,
      mutation.leaderEntryId ?? null,
    ]);
    let requestId = requestKeys.current.get(key);
    if (!requestId) {
      requestId = crypto.randomUUID();
      requestKeys.current.set(key, requestId);
    }
    setBusyKey(key);
    setErrorMessage(null);
    try {
      const result = await mutateAttendanceRegistry(actionId, { ...mutation, requestId });
      requestKeys.current.delete(key);
      await refresh();
      return result.entry ?? null;
    } catch (error) {
      if (error instanceof AttendanceRegistryHttpError && error.status === 409) await refresh();
      setErrorMessage(describeMutationError(error));
      if (error instanceof AttendanceRegistryHttpError && (error.status === 401 || error.status === 403)) {
        setLoadState("forbidden");
        setSnapshot(null);
      }
      throw error;
    } finally {
      setBusyKey(null);
    }
  }, [actionId, refresh]);

  return { snapshot, loadState, errorMessage, busyKey, refresh, mutate };
}

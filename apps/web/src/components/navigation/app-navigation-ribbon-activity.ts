"use client";

import { useState } from "react";

import {
  readActivityStatus,
  toggleActivityStatus,
  type ActivityStatus,
} from "@/lib/account/activity-status";

export type RibbonActivityUser = {
  id: string;
  unsafeMetadata?: unknown;
  reload: () => Promise<unknown>;
};

export type RibbonActivityState = {
  activityStatus: ActivityStatus;
  isUpdatingActivityStatus: boolean;
  activityStatusError: string | null;
  handleActivityStatusToggle: () => Promise<void>;
};

export function useRibbonActivityStatus(
  user: RibbonActivityUser | null,
): RibbonActivityState {
  const persistedActivityStatus = readActivityStatus(user?.unsafeMetadata);
  const [activityStatusState, setActivityStatusState] = useState<{
    userId: string | null;
    persistedStatus: ActivityStatus;
    value: ActivityStatus;
  }>({
    userId: user?.id ?? null,
    persistedStatus: persistedActivityStatus,
    value: persistedActivityStatus,
  });
  const activityStatus =
    activityStatusState.userId === (user?.id ?? null) &&
    activityStatusState.persistedStatus === persistedActivityStatus
      ? activityStatusState.value
      : persistedActivityStatus;
  const [isUpdatingActivityStatus, setIsUpdatingActivityStatus] = useState(false);
  const [activityStatusErrorState, setActivityStatusErrorState] = useState<{
    userId: string | null;
    persistedStatus: ActivityStatus;
    message: string | null;
  }>({
    userId: user?.id ?? null,
    persistedStatus: persistedActivityStatus,
    message: null,
  });
  const activityStatusError =
    activityStatusErrorState.userId === (user?.id ?? null) &&
    activityStatusErrorState.persistedStatus === persistedActivityStatus
      ? activityStatusErrorState.message
      : null;

  async function handleActivityStatusToggle() {
    if (!user || isUpdatingActivityStatus) {
      return;
    }

    const previousStatus = activityStatus;
    const nextStatus = toggleActivityStatus(previousStatus);
    setActivityStatusState({
      userId: user.id,
      persistedStatus: persistedActivityStatus,
      value: nextStatus,
    });
    setActivityStatusErrorState({
      userId: user.id,
      persistedStatus: persistedActivityStatus,
      message: null,
    });
    setIsUpdatingActivityStatus(true);

    try {
      const response = await fetch("/api/account/activity-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityStatus: nextStatus }),
      });
      const payload = (await response.json().catch(() => null)) as {
        activityStatus?: unknown;
        error?: unknown;
      } | null;

      if (!response.ok) {
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Impossible de mettre à jour le statut.",
        );
      }

      setActivityStatusState({
        userId: user.id,
        persistedStatus: persistedActivityStatus,
        value: payload?.activityStatus === "inactive" ? "inactive" : "active",
      });
      void user.reload().catch(() => undefined);
    } catch (error) {
      setActivityStatusState({
        userId: user.id,
        persistedStatus: persistedActivityStatus,
        value: previousStatus,
      });
      setActivityStatusErrorState({
        userId: user.id,
        persistedStatus: persistedActivityStatus,
        message:
          error instanceof Error
            ? error.message
            : "Impossible de mettre à jour le statut.",
      });
    } finally {
      setIsUpdatingActivityStatus(false);
    }
  }

  return {
    activityStatus,
    isUpdatingActivityStatus,
    activityStatusError,
    handleActivityStatusToggle,
  };
}

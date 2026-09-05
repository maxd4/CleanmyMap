"use client";

import { useEffect, useState } from "react";

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
  const [activityStatus, setActivityStatus] =
    useState<ActivityStatus>(persistedActivityStatus);
  const [isUpdatingActivityStatus, setIsUpdatingActivityStatus] = useState(false);
  const [activityStatusError, setActivityStatusError] = useState<string | null>(null);

  useEffect(() => {
    setActivityStatus(persistedActivityStatus);
    setActivityStatusError(null);
  }, [persistedActivityStatus, user?.id]);

  async function handleActivityStatusToggle() {
    if (!user || isUpdatingActivityStatus) {
      return;
    }

    const previousStatus = activityStatus;
    const nextStatus = toggleActivityStatus(previousStatus);
    setActivityStatus(nextStatus);
    setActivityStatusError(null);
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

      setActivityStatus(
        payload?.activityStatus === "inactive" ? "inactive" : "active",
      );
      void user.reload().catch(() => undefined);
    } catch (error) {
      setActivityStatus(previousStatus);
      setActivityStatusError(
        error instanceof Error
          ? error.message
          : "Impossible de mettre à jour le statut.",
      );
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

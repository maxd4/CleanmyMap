export type NotificationPreferences = {
  informationalEnabled: boolean;
  actionRemindersEnabled: boolean;
  mutedInformationActionIds: string[];
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  informationalEnabled: true,
  actionRemindersEnabled: true,
  mutedInformationActionIds: [],
};

async function readPreferencesResponse(response: Response): Promise<NotificationPreferences> {
  const payload = (await response.json().catch(() => null)) as Partial<NotificationPreferences> | null;
  if (!response.ok) {
    throw new Error("Les préférences de notification sont indisponibles.");
  }
  const mutedInformationActionIds = new Set<string>();
  if (Array.isArray(payload?.mutedInformationActionIds)) {
    for (const id of payload.mutedInformationActionIds) {
      if (typeof id !== "string") continue;
      const normalizedId = id.trim();
      if (normalizedId) mutedInformationActionIds.add(normalizedId);
    }
  }
  return {
    informationalEnabled: payload?.informationalEnabled !== false,
    actionRemindersEnabled: payload?.actionRemindersEnabled !== false,
    mutedInformationActionIds: [...mutedInformationActionIds],
  };
}

export async function loadNotificationPreferences(): Promise<NotificationPreferences> {
  return readPreferencesResponse(await fetch("/api/notifications/preferences", {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  }));
}

export async function updateNotificationPreferences(input: {
  informationalEnabled?: boolean;
  actionRemindersEnabled?: boolean;
  actionId?: string;
  muted?: boolean;
}): Promise<NotificationPreferences> {
  return readPreferencesResponse(await fetch("/api/notifications/preferences", {
    method: "PATCH",
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }));
}

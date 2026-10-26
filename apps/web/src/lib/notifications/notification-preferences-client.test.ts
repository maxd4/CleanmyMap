import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  loadNotificationPreferences,
  updateNotificationPreferences,
} from "./notification-preferences-client";

describe("notification preferences client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  it("applique les valeurs par défaut quand le serveur ne renvoie pas les champs optionnels", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

    await expect(loadNotificationPreferences()).resolves.toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it("préserve le désaccord explicite et déduplique les identifiants d'information", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      informationalEnabled: false,
      actionRemindersEnabled: false,
      mutedInformationActionIds: [" action-1 ", "action-1", "", null, 42],
    }), { status: 200 }));

    await expect(loadNotificationPreferences()).resolves.toEqual({
      informationalEnabled: false,
      actionRemindersEnabled: false,
      mutedInformationActionIds: ["action-1"],
    });
  });

  it("refuse une réponse HTTP en erreur plutôt que de fabriquer des préférences", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "forbidden" }), { status: 403 }));

    await expect(loadNotificationPreferences()).rejects.toThrow("indisponibles");
  });

  it("envoie une mise à jour PATCH same-origin sans cache", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ informationalEnabled: false }), { status: 200 }));

    await expect(updateNotificationPreferences({ informationalEnabled: false })).resolves.toEqual({
      informationalEnabled: false,
      actionRemindersEnabled: true,
      mutedInformationActionIds: [],
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/notifications/preferences", expect.objectContaining({
      method: "PATCH",
      cache: "no-store",
      credentials: "same-origin",
      body: JSON.stringify({ informationalEnabled: false }),
    }));
  });
});

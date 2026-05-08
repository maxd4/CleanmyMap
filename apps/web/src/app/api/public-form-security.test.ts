import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearRateLimitStore } from "@/lib/rate-limit/store";

const authMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const getCurrentUserRoleLabelMock = vi.hoisted(() => vi.fn());
const getSupabaseBrowserClientMock = vi.hoisted(() => vi.fn());
const uploadMultiplePhotosMock = vi.hoisted(() => vi.fn());
const actionsInsertMock = vi.hoisted(() => vi.fn());
const actionsUpdateMock = vi.hoisted(() => vi.fn());
const testEmail = ["test", "example.org"].join("@");
const partnerContactEmail = ["contact", "basbelleville.fr"].join("@");

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: getCurrentUserIdentityMock,
  getCurrentUserRoleLabel: getCurrentUserRoleLabelMock,
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: getSupabaseBrowserClientMock,
}));

vi.mock("@/lib/photo-upload", () => ({
  photoUploadService: {
    uploadMultiplePhotos: uploadMultiplePhotosMock,
  },
}));

describe("public form security guardrails", () => {
  beforeEach(() => {
    clearRateLimitStore();
    authMock.mockResolvedValue({ userId: "user-test-1" });
    getCurrentUserIdentityMock.mockResolvedValue({
      userId: "user-test-1",
      displayName: "Test User",
      email: testEmail,
      role: "benevole",
    });
    getCurrentUserRoleLabelMock.mockResolvedValue("benevole");
    uploadMultiplePhotosMock.mockResolvedValue([
      { url: "https://example.test/photo-1.jpg", path: "action-test-1/1.jpg" },
    ]);
    actionsUpdateMock.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    actionsInsertMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "action-test-1" },
          error: null,
        }),
      }),
    });
    getSupabaseBrowserClientMock.mockReturnValue({
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(),
          getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.test/photo.jpg" } })),
        })),
      },
      from: vi.fn((table: string) => {
        if (table !== "actions") {
          throw new Error(`Unexpected table ${table}`);
        }
        return {
          insert: actionsInsertMock,
          update: actionsUpdateMock,
        };
      }),
    });
  });

  it("returns a standardized 429 payload for newsletter honeypots", async () => {
    const { POST } = await import("./newsletter/subscribe/route");
    const response = await POST(
      new Request("http://localhost/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          gdprConsent: true,
          honeypot: "bot",
          submittedAt: Date.now(),
        }),
      }),
    );

    const body = (await response.json()) as {
      error?: string;
      kind?: string;
      status?: string;
    };

    expect(response.status).toBe(429);
    expect(body).toMatchObject({
      error: "Impossible de vous inscrire pour le moment.",
      kind: "validation",
      status: "rate_limited",
    });
  });

  it("returns a standardized 429 payload for quick actions submissions", async () => {
    const { POST } = await import("./actions/simple/route");
    const response = await POST(
      new Request("http://localhost/api/actions/simple", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Action test",
          description: "Description valide pour le test",
          location: "Paris",
          date: "2026-05-07",
          participantCount: 2,
          wasteAmount: 0,
          photos: [],
          organizerName: "Test User",
          organizerEmail: testEmail,
          isPublic: true,
          honeypot: "",
          submittedAt: Date.now(),
        }),
      }),
    );

    const body = (await response.json()) as {
      error?: string;
      kind?: string;
      status?: string;
    };

    expect(response.status).toBe(429);
    expect(body).toMatchObject({
      error: "Impossible d'enregistrer l'action pour le moment.",
      kind: "validation",
      status: "rate_limited",
    });
  });

  it("returns a standardized 429 payload for partner onboarding honeypots", async () => {
    const { POST } = await import("./partners/onboarding-requests/route");
    const response = await POST(
      new Request("http://localhost/api/partners/onboarding-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationName: "Bas Belleville Atelier",
          organizationType: "commerce",
          partnerScope: "local",
          legalIdentity: "Bas Belleville Atelier SAS",
          coverage: {
            arrondissements: [10, 11],
            quartiers: [],
          },
          contributionTypes: ["accueil"],
          relayActions: "",
          availability: {
            slots: [
              { day: "tue", start: "10:00", end: "18:00" },
            ],
          },
          contactName: "Marie Dupont",
          contactChannel: "Email",
          contactDetails: partnerContactEmail,
          motivation: "Valoriser le quartier avec une vitrine locale utile.",
          honeypot: "bot",
          submittedAt: Date.now(),
        }),
      }),
    );

    const body = (await response.json()) as {
      error?: string;
      kind?: string;
      status?: string;
    };

    expect(response.status).toBe(429);
    expect(body).toMatchObject({
      error: "Impossible d'envoyer la demande pour le moment.",
      kind: "validation",
      status: "rate_limited",
    });
  });

  it("returns a standardized 429 payload for promotion requests", async () => {
    const { POST } = await import("./community/promotion-requests/route");
    const response = await POST(
      new Request("http://localhost/api/community/promotion-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestedRole: "elu",
          motivation: "Je souhaite contribuer davantage au pilotage local.",
          honeypot: "",
          submittedAt: Date.now(),
        }),
      }),
    );

    const body = (await response.json()) as {
      error?: string;
      kind?: string;
      status?: string;
    };

    expect(response.status).toBe(429);
    expect(body).toMatchObject({
      error: "Impossible d'envoyer la demande pour le moment.",
      kind: "validation",
      status: "rate_limited",
    });
  });

  it("accepts multipart quick action submissions with photos", async () => {
    const { POST } = await import("./actions/simple/route");
    const formData = new FormData();
    formData.set("title", "Action test");
    formData.set("description", "Description valide pour le test");
    formData.set("location", "Paris");
    formData.set("date", "2026-05-07");
    formData.set("participantCount", "2");
    formData.set("wasteAmount", "0");
    formData.set("organizerName", "Test User");
    formData.set("organizerEmail", testEmail);
    formData.set("isPublic", "true");
    formData.set("honeypot", "");
    formData.set("submittedAt", String(Date.now() - 5000));
    formData.append("photos", new File(["photo"], "photo.jpg", { type: "image/jpeg" }));

    const response = await POST(
      new Request("http://localhost/api/actions/simple", {
        method: "POST",
        body: formData,
      }),
    );

    const body = (await response.json()) as {
      success?: boolean;
      id?: string;
      photoCount?: number;
      error?: string;
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      id: "action-test-1",
      photoCount: 1,
    });
    expect(uploadMultiplePhotosMock).toHaveBeenCalledWith(expect.any(Array), "action-test-1");
    expect(actionsInsertMock).toHaveBeenCalledTimes(1);
  });
});

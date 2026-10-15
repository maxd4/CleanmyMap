import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const loadAuthorizedEventMock = vi.hoisted(() => vi.fn());
const loadGalleryMock = vi.hoisted(() => vi.fn());
const upsertGalleryMock = vi.hoisted(() => vi.fn());
const withdrawGalleryMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/spogomi/route-auth", () => ({ loadAuthorizedSpogomiEvent: loadAuthorizedEventMock }));
vi.mock("@/lib/spogomi/photo-gallery-service", () => ({
  loadSpogomiGalleryEntries: loadGalleryMock,
  upsertSpogomiGalleryPhoto: upsertGalleryMock,
  withdrawSpogomiGalleryPhoto: withdrawGalleryMock,
}));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: () => new Response(JSON.stringify({ error: "Internal error" }), { status: 500 }),
  validationErrorResponse: (details: unknown) => new Response(JSON.stringify({ error: details }), { status: 400 }),
}));

const params = { eventId: "event-1" };
const authorized = { event: { action_id: "action-1" }, supabase: { server: true } };
const draftPhoto = {
  id: "photo-1",
  url: "https://cdn.example/photo.jpg",
  alt: "Collecte dans un parc",
  sourceUrl: "https://source.example/photo",
  ownerName: "Association synthétique",
  status: "draft" as const,
};

function getRequest() {
  return new Request("https://cleanmymap.example/api/spogomi/events/event-1/gallery");
}

describe("SPOGOMI gallery route behavior", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "organizer-1" });
    loadAuthorizedEventMock.mockResolvedValue({ authorized, supabase: authorized.supabase });
    loadGalleryMock.mockResolvedValue([]);
    upsertGalleryMock.mockResolvedValue({ id: "photo-1", status: "draft" });
    withdrawGalleryMock.mockResolvedValue(true);
  });

  it("denies anonymous reads and never reaches the gallery service", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: false });
    const { GET } = await import("./route");

    const response = await GET(getRequest(), { params: Promise.resolve(params) });

    expect(response.status).toBe(401);
    expect(loadAuthorizedEventMock).not.toHaveBeenCalled();
    expect(loadGalleryMock).not.toHaveBeenCalled();
  });

  it("preserves an authorization response before reading or mutating gallery data", async () => {
    loadAuthorizedEventMock.mockResolvedValueOnce({ supabase: {}, authorized: { response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }) } });
    const { GET } = await import("./route");

    const response = await GET(getRequest(), { params: Promise.resolve(params) });

    expect(response.status).toBe(403);
    expect(loadGalleryMock).not.toHaveBeenCalled();
  });

  it("reads the organizer-scoped gallery with the action owner", async () => {
    const { GET } = await import("./route");

    const response = await GET(getRequest(), { params: Promise.resolve(params) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ gallery: [] });
    expect(loadGalleryMock).toHaveBeenCalledWith({ supabase: authorized.supabase, actionId: "action-1" });
  });

  it("rejects an incomplete published photo before any organizer lookup", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("https://cleanmymap.example", {
      method: "POST",
      body: JSON.stringify({ ...draftPhoto, status: "published" }),
    }), { params: Promise.resolve(params) });

    expect(response.status).toBe(400);
    expect(loadAuthorizedEventMock).not.toHaveBeenCalled();
    expect(upsertGalleryMock).not.toHaveBeenCalled();
  });

  it("upserts a draft with the authenticated actor and scoped action", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("https://cleanmymap.example", {
      method: "POST",
      body: JSON.stringify(draftPhoto),
    }), { params: Promise.resolve(params) });

    expect(response.status).toBe(200);
    expect(upsertGalleryMock).toHaveBeenCalledWith({
      supabase: authorized.supabase,
      actionId: "action-1",
      photo: draftPhoto,
      actorUserId: "organizer-1",
    });
  });

  it("accepts an explicitly approved published photo and rejects unsupported URL schemes", async () => {
    const { POST } = await import("./route");
    const published = {
      ...draftPhoto,
      status: "published" as const,
      rightsStatus: "authorized" as const,
      approvedForPublication: true,
      subjectProtectionReviewed: true,
      minorProtectionReviewed: true,
    };
    const accepted = await POST(new Request("https://cleanmymap.example", {
      method: "POST",
      body: JSON.stringify({ ...published, url: "http://cdn.example/photo.jpg", sourceUrl: "http://source.example/photo" }),
    }), { params: Promise.resolve(params) });
    expect(accepted.status).toBe(200);

    const unsupported = await POST(new Request("https://cleanmymap.example", {
      method: "POST",
      body: JSON.stringify({ ...draftPhoto, url: "ftp://cdn.example/photo.jpg" }),
    }), { params: Promise.resolve(params) });
    expect(unsupported.status).toBe(400);
  });

  it("converts read and mutation service failures to bounded API errors", async () => {
    const { GET, POST, DELETE } = await import("./route");
    loadGalleryMock.mockRejectedValueOnce(new Error("gallery provider detail"));
    expect((await GET(getRequest(), { params: Promise.resolve(params) })).status).toBe(500);

    upsertGalleryMock.mockRejectedValueOnce(new Error("upsert provider detail"));
    expect((await POST(new Request("https://cleanmymap.example", { method: "POST", body: JSON.stringify(draftPhoto) }), { params: Promise.resolve(params) })).status).toBe(500);

    withdrawGalleryMock.mockRejectedValueOnce(new Error("withdraw provider detail"));
    expect((await DELETE(new Request(`${getRequest().url}?photoId=photo-1`), { params: Promise.resolve(params) })).status).toBe(500);
  });

  it("requires a photo reference, preserves not-found, and reports withdrawal", async () => {
    const { DELETE } = await import("./route");
    const missing = await DELETE(getRequest(), { params: Promise.resolve(params) });
    expect(missing.status).toBe(400);

    withdrawGalleryMock.mockResolvedValueOnce(false);
    const absent = await DELETE(new Request(`${getRequest().url}?photoId=missing`), { params: Promise.resolve(params) });
    expect(absent.status).toBe(404);

    const withdrawn = await DELETE(new Request(`${getRequest().url}?photoId=photo-1`), { params: Promise.resolve(params) });
    expect(withdrawn.status).toBe(200);
    await expect(withdrawn.json()).resolves.toEqual({ status: "withdrawn" });
    expect(withdrawGalleryMock).toHaveBeenLastCalledWith(expect.objectContaining({ actionId: "action-1", photoId: "photo-1" }));
  });
});

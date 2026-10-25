import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseAdminClientMock = vi.hoisted(() => vi.fn());
const resolveEmailMock = vi.hoisted(() => vi.fn());
const expectedAuthorEmail = ["author", "example.test"].join("@");

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: getSupabaseAdminClientMock,
}));

vi.mock("@/lib/services/clerk", () => ({
  getClerkService: vi.fn(async () => ({ resolveEmail: resolveEmailMock })),
}));

function installSupabaseResponseQueue(
  responses: Array<{ data: unknown; error: null }>,
): void {
  const maybeSingleMock = vi.fn();
  for (const response of responses) {
    maybeSingleMock.mockResolvedValueOnce(response);
  }

  const selectMock = vi.fn(() => ({
    eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })),
  }));
  const updateMock = vi.fn(() => ({
    eq: vi.fn(() => ({
      select: vi.fn(() => ({ maybeSingle: maybeSingleMock })),
    })),
  }));
  getSupabaseAdminClientMock.mockReturnValue({
    from: vi.fn(() => ({ select: selectMock, update: updateMock })),
  });
}

const baseParams = {
  action: "content_restricted" as const,
  contentType: "action",
  contentId: "action-1",
  actorUserId: "admin-1",
  reason: "Motif de moderation confirme.",
};

describe("applyCanonicalLegalContentMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveEmailMock.mockResolvedValue(expectedAuthorEmail);
  });

  it("normalizes a valid persistence projection and preserves the author lookup", async () => {
    installSupabaseResponseQueue([
      {
        data: {
          status: "approved",
          moderation_visibility: "visible",
          created_by_clerk_id: "author-1",
        },
        error: null,
      },
      {
        data: {
          status: "approved",
          moderation_visibility: "hidden",
          created_by_clerk_id: "author-1",
        },
        error: null,
      },
    ]);

    const { applyCanonicalLegalContentMutation } = await import(
      "./legal-content-moderation"
    );
    await expect(
      applyCanonicalLegalContentMutation(baseParams),
    ).resolves.toMatchObject({
      supported: true,
      found: true,
      beforeState: {
        status: "approved",
        moderationVisibility: "visible",
        authorUserId: "author-1",
      },
      afterState: {
        status: "approved",
        moderationVisibility: "hidden",
        authorUserId: "author-1",
      },
      authorEmail: expectedAuthorEmail,
    });
  });

  it("rejects an invalid read projection instead of treating it as a missing action", async () => {
    installSupabaseResponseQueue([
      {
        data: {
          status: 123,
          moderation_visibility: "visible",
          created_by_clerk_id: "author-1",
        },
        error: null,
      },
    ]);

    const { applyCanonicalLegalContentMutation } = await import(
      "./legal-content-moderation"
    );
    await expect(
      applyCanonicalLegalContentMutation(baseParams),
    ).rejects.toThrow("Canonical action moderation read returned invalid data");
  });

  it("rejects an invalid update projection without exposing the raw provider value", async () => {
    installSupabaseResponseQueue([
      {
        data: {
          status: "approved",
          moderation_visibility: "visible",
          created_by_clerk_id: "author-1",
        },
        error: null,
      },
      {
        data: {
          status: "approved",
          moderation_visibility: { leaked: true },
          created_by_clerk_id: "author-1",
        },
        error: null,
      },
    ]);

    const { applyCanonicalLegalContentMutation } = await import(
      "./legal-content-moderation"
    );
    await expect(
      applyCanonicalLegalContentMutation(baseParams),
    ).rejects.toThrow("Canonical action moderation update returned invalid data");
  });
});

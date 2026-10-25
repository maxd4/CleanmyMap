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
  responses: Array<{ data: unknown; error: unknown }>,
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

  it("keeps unsupported content types and missing ids as a no-op", async () => {
    const { applyCanonicalLegalContentMutation } = await import(
      "./legal-content-moderation"
    );

    await expect(applyCanonicalLegalContentMutation({
      ...baseParams,
      contentType: "partner",
    })).resolves.toEqual({
      supported: false,
      found: false,
      beforeState: {},
      afterState: {},
      authorEmail: null,
    });
    await expect(applyCanonicalLegalContentMutation({
      ...baseParams,
      contentId: null,
    })).resolves.toEqual({
      supported: false,
      found: false,
      beforeState: {},
      afterState: {},
      authorEmail: null,
    });
    expect(getSupabaseAdminClientMock).not.toHaveBeenCalled();
  });

  it("keeps a missing canonical action distinct from an invalid projection", async () => {
    installSupabaseResponseQueue([{ data: null, error: null }]);
    const { applyCanonicalLegalContentMutation } = await import(
      "./legal-content-moderation"
    );

    await expect(applyCanonicalLegalContentMutation(baseParams)).resolves.toEqual({
      supported: true,
      found: false,
      beforeState: {},
      afterState: {},
      authorEmail: null,
    });
  });

  const supabaseErrorCases: Array<readonly [string, Array<{ data: unknown; error: unknown }>, string]> = [
    ["read", [{ data: null, error: { code: "PGRST116" } }], "Canonical action moderation read failed"],
    ["update", [
      { data: { status: "approved", moderation_visibility: "visible", created_by_clerk_id: "author-1" }, error: null },
      { data: null, error: { code: "42501" } },
    ], "Canonical action moderation update failed"],
  ];

  it.each(supabaseErrorCases)("normalizes a Supabase %s error", async (_stage, responses, message) => {
    installSupabaseResponseQueue(responses);
    const { applyCanonicalLegalContentMutation } = await import(
      "./legal-content-moderation"
    );

    await expect(applyCanonicalLegalContentMutation(baseParams)).rejects.toThrow(message);
  });

  it("does not resolve an email when the canonical author is absent", async () => {
    installSupabaseResponseQueue([
      {
        data: {
          status: "approved",
          moderation_visibility: "visible",
          created_by_clerk_id: null,
        },
        error: null,
      },
      {
        data: {
          status: "approved",
          moderation_visibility: "hidden",
          created_by_clerk_id: null,
        },
        error: null,
      },
    ]);
    const { applyCanonicalLegalContentMutation } = await import(
      "./legal-content-moderation"
    );

    await expect(applyCanonicalLegalContentMutation(baseParams)).resolves.toMatchObject({
      found: true,
      authorEmail: null,
    });
    expect(resolveEmailMock).not.toHaveBeenCalled();
  });
});

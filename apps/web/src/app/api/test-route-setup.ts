import { vi } from "vitest";

export function prepareReportTestEnvironment() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-13T12:00:00Z"));
  vi.resetModules();
  vi.clearAllMocks();
}

export function createEmailServiceModule(sendEmail: unknown) {
  return {
    sendEmail,
    isEmailQuotaExceededError: (error: unknown) =>
      error instanceof Error && error.name === "EmailQuotaExceededError",
  };
}

export function createEnvironmentModule(env: unknown) {
  return { env };
}

export function createPublicValidationModule({
  createPublicRateLimitResponse,
  hasHoneypotSignal,
  hasRecentSubmission,
  isPlaceholderHost,
  rejectPublicFormAbuse,
}: {
  createPublicRateLimitResponse: (message: string) => Response | null;
  hasHoneypotSignal: (value: unknown) => boolean;
  hasRecentSubmission: (value: unknown) => boolean;
  isPlaceholderHost?: unknown;
    rejectPublicFormAbuse?: unknown;
}) {
  const rejectAbuse =
    rejectPublicFormAbuse ??
    ((payload: { honeypot?: unknown; submittedAt?: unknown }, message: string) =>
      hasHoneypotSignal(payload.honeypot) || hasRecentSubmission(payload.submittedAt)
        ? (createPublicRateLimitResponse as (value: string) => Response | null)(message)
        : null);
  return {
    createPublicRateLimitResponse,
    hasHoneypotSignal,
    hasRecentSubmission,
    parseJsonBodyWithSchema: async (
      request: Request,
      schema: { safeParse: (value: unknown) => { success: boolean; data?: unknown } },
    ) => {
      const parsed = schema.safeParse(await request.json());
      return parsed.success
        ? { ok: true, data: parsed.data }
        : { ok: false, response: new Response("invalid", { status: 400 }) };
    },
    rejectPublicFormAbuse: rejectAbuse,
    ...(isPlaceholderHost ? { isPlaceholderHost } : {}),
  };
}

export function createServerRateLimitModule({
  verifyRateLimit,
  createServerRateLimitResponse,
}: {
  verifyRateLimit: (
    request: Request,
    options: { limit?: number; window?: number },
  ) => Promise<{ allowed: boolean; retryAfter?: number | null; [key: string]: unknown }>;
  createServerRateLimitResponse: (
    allowed: boolean,
    retryAfter: number | null | undefined,
    result: unknown,
  ) => Response | null;
}) {
  const enforceServerRateLimit = async (
    request: Request,
    options: { limit?: number; window?: number } = {},
  ) => {
    const result = await verifyRateLimit(request, options);
    return createServerRateLimitResponse(result.allowed, result.retryAfter, result);
  };
  return { createServerRateLimitResponse, verifyRateLimit, enforceServerRateLimit };
}

export function createReportStorageSupabaseMock(
  extension: "csv" | "json",
  options?: { cacheHit?: boolean },
) {
  const createSignedUrlMock = vi.fn();
  const filePath = `actions-${extension}/cache.${extension}`;
  const signedUrlObject = new URL(
    `https://supabase.test/storage/v1/object/sign/reports/${filePath}`,
  );
  signedUrlObject.searchParams.set("token", "abc123");
  const signedUrl = signedUrlObject.toString();
  if (options?.cacheHit) {
    createSignedUrlMock.mockResolvedValue({ data: { signedUrl }, error: null });
  } else {
    createSignedUrlMock
      .mockResolvedValueOnce({ data: null, error: { message: "not found" } })
      .mockResolvedValueOnce({ data: { signedUrl }, error: null });
  }
  const uploadMock = vi.fn(async () => ({ data: { path: filePath }, error: null }));
  return {
    storage: { from: vi.fn(() => ({ createSignedUrl: createSignedUrlMock, upload: uploadMock })) },
    createSignedUrlMock,
    uploadMock,
  };
}

export function createReportUnifiedSourceModule(fetchUnifiedActionContracts: unknown) {
  return { fetchUnifiedActionContracts, parseEntityTypesParam: () => null };
}

export function createReportScopeModule(filterActionContractsByScope: unknown) {
  return { filterActionContractsByScope };
}

export function createReportActionDataset() {
  return {
    items: [
      {
        id: "action-1",
        dates: { createdAt: "2026-05-01", observedAt: "2026-05-02" },
        metadata: {
          actorName: "Alice",
          associationName: "Clean team",
          wasteKg: 12,
          cigaretteButts: 50,
          volunteersCount: 4,
          durationMinutes: 90,
          notes: "ok",
          notesPlain: "ok",
          manualDrawing: null,
        },
        location: { label: "Paris", latitude: 48.85, longitude: 2.35 },
        status: "approved",
        type: "action",
        source: "supabase",
        geometry: { kind: "point", geojson: null, confidence: "high" },
      },
    ],
    isTruncated: true,
    sourceHealth: { partial: true, warnings: ["sheet lag"] },
  };
}

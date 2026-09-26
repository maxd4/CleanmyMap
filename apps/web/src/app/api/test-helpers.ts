import { expect, vi } from "vitest";

type MockFunction = {
  mockReturnThis?: () => unknown;
};

export const rateLimitMocks = {
  verifyRateLimit: vi.fn(),
  createServerRateLimitResponse: vi.fn(),
};

export const authenticatedRouteMocks = {
  requireAuthenticatedAccess: vi.fn(),
  getCurrentUserIdentity: vi.fn(),
  pickTraceableActorName: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  createSignalement: vi.fn(),
  hasAnalyticsConsentCookie: vi.fn(),
};

export const communityRequestMocks = {
  auth: vi.fn(),
  getCurrentUserIdentity: vi.fn(),
  getCurrentUserRoleLabel: vi.fn(),
};

export function createAuthenticatedRouteAuthzModule() {
  return {
    getCurrentUserIdentity: authenticatedRouteMocks.getCurrentUserIdentity,
    pickTraceableActorName: authenticatedRouteMocks.pickTraceableActorName,
    requireAuthenticatedAccess: authenticatedRouteMocks.requireAuthenticatedAccess,
  };
}

export function createSignalementModule() {
  return { createSignalement: authenticatedRouteMocks.createSignalement };
}

export function createAnalyticsConsentModule() {
  return { hasAnalyticsConsentCookie: authenticatedRouteMocks.hasAnalyticsConsentCookie };
}

export function createAdminAuthzModule(requireAdminAccess: unknown) {
  return { requireAdminAccess };
}

export function createAdminAuthResponseModule() {
  return {
    adminAccessErrorJsonResponse: () => new Response("forbidden", { status: 403 }),
  };
}

export function createAdminAuditModule(appendAdminOperationAudit: unknown) {
  return { appendAdminOperationAudit };
}


export function createApiErrorModule() {
  return {
    handleApiError: (error: unknown) =>
      new Response(error instanceof Error ? error.message : "error", { status: 500 }),
  };
}

export function createPublicSnapshotModule(loadOrRefreshPublicSurfaceSnapshot: unknown) {
  return { loadOrRefreshPublicSurfaceSnapshot };
}

export function createRateLimitModule() {
  const enforceServerRateLimit = async (
    request: Request,
    options: { limit?: number; window?: number } = {},
  ) => {
    const result = await rateLimitMocks.verifyRateLimit(request, options);
    return rateLimitMocks.createServerRateLimitResponse(
      result.allowed,
      result.retryAfter,
      result,
    );
  };
  return {
    verifyRateLimit: rateLimitMocks.verifyRateLimit,
    createServerRateLimitResponse: rateLimitMocks.createServerRateLimitResponse,
    enforceServerRateLimit,
    withServerRateLimit: async <T extends Response>(
      request: Request,
      options: { limit?: number; window?: number },
      handler: () => Promise<T>,
    ) => (await enforceServerRateLimit(request, options)) ?? handler(),
  };
}

export function mockAllowedRateLimit(limit: number, windowMs = 60_000) {
  rateLimitMocks.verifyRateLimit.mockResolvedValue({
    allowed: true,
    limit,
    remaining: limit - 1,
    reset: Date.now() + windowMs,
  });
  rateLimitMocks.createServerRateLimitResponse.mockReturnValue(null);
}

export function mockRejectedRateLimit(limit: number, retryAfter = 60, windowMs = 60_000) {
  rateLimitMocks.verifyRateLimit.mockResolvedValueOnce({
    allowed: false,
    limit,
    remaining: 0,
    reset: Date.now() + windowMs,
    retryAfter,
  });
  rateLimitMocks.createServerRateLimitResponse.mockReturnValueOnce(
    new Response(JSON.stringify({ code: "RATE_LIMIT_EXCEEDED" }), { status: 429 }),
  );
}


export function createClerkAuthModule(auth: unknown) {
  return { auth };
}

export function createSupabaseServerModule(getSupabaseServerClient: unknown) {
  return { getSupabaseServerClient };
}

export function createSupabaseClerkRlsModule(getSupabaseClerkRlsClient: unknown) {
  return { getSupabaseClerkRlsClient };
}

export function createRateLimitedHandlerModule() {
  return {
    createRateLimitedHandler: (handlers: Record<string, unknown>) => Object.values(handlers)[0],
  };
}

export function createSupabaseAdminModule(
  queryMock: Record<string, MockFunction>,
  chainMethods: readonly string[],
) {
  const client = Object.fromEntries(
    Object.entries(queryMock).map(([name, mock]) => [
      name,
      chainMethods.includes(name) ? mock.mockReturnThis?.() : mock,
    ]),
  );
  return { getSupabaseAdminClient: () => client };
}

export function expectNoSupabaseWrites(sources: readonly string[]) {
  for (const source of sources) {
    expect(source).not.toMatch(/\.insert\s*\(/);
    expect(source).not.toMatch(/\.update\s*\(/);
    expect(source).not.toMatch(/\.delete\s*\(/);
    expect(source).not.toMatch(/\.upsert\s*\(/);
  }
}

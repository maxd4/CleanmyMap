import { vi } from "vitest";

const sharedMocks = vi.hoisted(() => ({
  auth: vi.fn(),
  server: vi.fn(),
  verifyRateLimit: vi.fn(),
  createServerRateLimitResponse: vi.fn(),
}));

export const authMock = sharedMocks.auth;
export const serverMock = sharedMocks.server;
export const verifyRateLimitMock = sharedMocks.verifyRateLimit;
export const createServerRateLimitResponseMock = sharedMocks.createServerRateLimitResponse;

vi.mock("@clerk/nextjs/server", () => ({ auth: sharedMocks.auth }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: sharedMocks.server }));
vi.mock("@/lib/rate-limit/server", () => ({
  verifyRateLimit: sharedMocks.verifyRateLimit,
  createServerRateLimitResponse: sharedMocks.createServerRateLimitResponse,
}));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: vi.fn(() => new Response("Unauthorized", { status: 401 })),
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: vi.fn((error: unknown) => new Response(error instanceof Error ? error.message : "error", { status: 500 })),
  validationErrorResponse: vi.fn(() => new Response("Invalid", { status: 400 })),
}));

export function resetApiRouteMocks(userId: string) {
  vi.resetModules();
  vi.clearAllMocks();
  authMock.mockResolvedValue({ userId });
  verifyRateLimitMock.mockResolvedValue({ allowed: true, retryAfter: 0, source: "test" });
  createServerRateLimitResponseMock.mockReturnValue(null);
}

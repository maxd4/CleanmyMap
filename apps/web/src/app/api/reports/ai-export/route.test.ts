import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReportGenerationHistoryInput } from "@/lib/reports/report-generation-history-contract";
import { REPORT_ADVANCED_FILTER_DEFAULTS } from "@/lib/reports/report-advanced-filters";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  rateLimit: vi.fn(),
  resolve: vi.fn(),
  quota: vi.fn(),
  persistence: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.auth }));
vi.mock("@/lib/rate-limit/server", () => ({
  verifyRateLimit: mocks.rateLimit,
  createServerRateLimitResponse: (allowed: boolean) => allowed ? null : new Response("rate limited", { status: 429 }),
}));
vi.mock("../generations/route.input", async (importOriginal) => {
  const original = await importOriginal<typeof import("../generations/route.input")>();
  return { ...original, resolveReportGenerationInput: mocks.resolve };
});
vi.mock("@/lib/reports/report-export-quota", () => ({ reserveReportExportSlot: mocks.quota }));
vi.mock("../generations/route.persistence", () => ({
  persistReportGenerationWithQuota: mocks.persistence,
  auditReportGenerationError: mocks.audit,
}));

import { POST } from "./route";

const validBody = {
  input: { type: "single_action", actionId: "00000000-0000-4000-8000-000000000001" },
  detailLevel: "default",
  modules: { dataAndCartography: true, transparencyAndMethods: true, rawData: false, detailedFiles: true },
  theme: "impact",
};

function resolvedInput(): ReportGenerationHistoryInput {
  return {
    scopeKind: "single_action",
    scopeValue: "private",
    scopeLabel: "private",
    detailLevel: "default",
    modules: validBody.modules,
    theme: "impact",
    payload: {
      title: "private",
      rubrique: "private",
      periode: "2026",
      organizationType: "private",
      organizationName: "PRIVATE_ORGANIZATION_SENTINEL",
      data: { chapters: [{ id: "resultats-terrain", title: "ignored", lines: ["private"], rows: [{ email: "PII_EMAIL_SENTINEL" }], stats: [{ label: "Mégots", value: 0 }] }] },
    },
  };
}

function request(body: unknown): Request {
  return new Request("http://localhost/api/reports/ai-export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/reports/ai-export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ ok: true, userId: "reader" });
    mocks.rateLimit.mockResolvedValue({ allowed: true, retryAfter: 0 });
    mocks.resolve.mockImplementation(async () => ({ input: resolvedInput() }));
  });

  it("returns one private Markdown attachment from the canonical resolved report", async () => {
    const response = await POST(request(validBody));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown; charset=utf-8");
    expect(response.headers.get("content-disposition")).toContain("attachment; filename=\"cleanmymap-rapport-ia-");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(body).toContain('"id": "cigarette_butts.count"');
    expect(body).not.toContain("PII_EMAIL_SENTINEL");
    expect(mocks.resolve).toHaveBeenCalledWith(expect.objectContaining({ kind: "single_action" }), expect.any(String), "reader", expect.any(String), { auditFailures: false });
    expect(mocks.quota).not.toHaveBeenCalled();
    expect(mocks.persistence).not.toHaveBeenCalled();
  });

  it("rejects forged or malformed scopes with the canonical strict parser", async () => {
    const response = await POST(request({
      input: { type: "multi_action", period: { id: "custom_range", from: "2026-01-01", to: "2026-02-01" }, scope: { kind: "association", value: "forged", admin: true } },
      detailLevel: "default",
      modules: validBody.modules,
      unexpected: "forged",
    }));
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it.each(["global", "account", "association", "arrondissement"] as const)(
    "accepts the canonical multi-action request shape for scope %s",
    async (kind) => {
      const response = await POST(request({
        input: {
          type: "multi_action",
          period: { id: "custom_range", from: "2026-01-01", to: "2026-02-01" },
          scope: { kind, ...(kind === "global" ? {} : { value: "scope-value" }) },
          filters: REPORT_ADVANCED_FILTER_DEFAULTS,
        },
        detailLevel: "exhaustif",
        modules: { dataAndCartography: true, transparencyAndMethods: true, rawData: true, detailedFiles: true },
        theme: "scientific",
      }));

      expect(response.status).toBe(200);
      expect(mocks.resolve).toHaveBeenCalledWith(expect.objectContaining({
        kind: "multi_action",
        request: expect.objectContaining({ theme: "scientific" }),
      }), expect.any(String), "reader", expect.any(String), { auditFailures: false });
    },
  );

  it("returns the canonical no-data refusal without changing it into a successful empty export", async () => {
    mocks.resolve.mockResolvedValueOnce({ response: new Response(JSON.stringify({ error: "Aucune action admissible." }), { status: 422 }) });
    const response = await POST(request({
      input: { type: "multi_action", period: { id: "full_history" }, scope: { kind: "global" } },
      detailLevel: "concis",
      modules: { dataAndCartography: false, transparencyAndMethods: false, rawData: false, detailedFiles: false },
    }));
    expect(response.status).toBe(422);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("keeps authentication and rate limiting at the route boundary", async () => {
    mocks.auth.mockResolvedValueOnce({ ok: false, error: "unauthorized" });
    expect((await POST(request(validBody))).status).toBe(401);
    expect(mocks.rateLimit).not.toHaveBeenCalled();

    mocks.auth.mockResolvedValueOnce({ ok: true, userId: "reader" });
    mocks.rateLimit.mockResolvedValueOnce({ allowed: false, retryAfter: 60 });
    const limited = await POST(request(validBody));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
});

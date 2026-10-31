import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ApiAuthorizationContractEntry } from "@/lib/auth/api-authorization-contract";
import {
  buildInlineRouteEntry,
  collectLocalModuleSources,
  missingEvidence,
} from "./api-boundary-evidence-analysis";
import { extractRouteMethods } from "./api-boundary-analysis";

describe("API security evidence analysis", () => {
  it("follows literal dynamic imports without regex backtracking", () => {
    const root = mkdtempSync(join(tmpdir(), "cleanmymap-api-evidence-"));
    try {
      const routePath = join(root, "route.ts");
      const helperPath = join(root, "helper.ts");
      writeFileSync(routePath, 'export async function GET() { return import("./helper"); }');
      writeFileSync(helperPath, "export const helperEvidence = true;");
      const sources = new Map<string, string>();

      collectLocalModuleSources(routePath, readFileSync(routePath, "utf8"), sources, new Set());

      expect(sources.has(helperPath)).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not let an import or a different HTTP method satisfy method evidence", () => {
    const fixture = `
      import { requireCreatorAccess } from "@/lib/authz";
      export async function GET() {
        return requireCreatorAccess();
      }
      export async function POST() {
        return new Response("ok");
      }
    `;
    const routeEntry = { source: fixture, methods: extractRouteMethods(fixture) };
    const entry: ApiAuthorizationContractEntry = {
      expected: "creator access",
      dimensions: ["admin/creator role"],
      actual: "POST requires creator access",
      handlerEvidence: ["requireCreatorAccess"],
      evidenceScope: "method",
    };

    expect(missingEvidence(entry, routeEntry, "POST")).toEqual(["requireCreatorAccess"]);
  });

  it("does not count a comment as execution evidence", () => {
    const fixture = `
      export async function POST() {
        // requireCreatorAccess is expected here but is not called.
        return new Response("ok");
      }
    `;
    const routeEntry = { source: fixture, methods: extractRouteMethods(fixture) };
    const entry: ApiAuthorizationContractEntry = {
      expected: "creator access",
      dimensions: ["admin/creator role"],
      actual: "POST requires creator access",
      handlerEvidence: ["requireCreatorAccess"],
      evidenceScope: "method",
    };

    expect(missingEvidence(entry, routeEntry, "POST")).toEqual(["requireCreatorAccess"]);
  });

  it("does not let an imported but unused helper satisfy module evidence", () => {
    const routeEntry = buildInlineRouteEntry(
      `
        import { unusedAudit } from "./unused";
        export async function PATCH() {
          return new Response("ok");
        }
      `,
      { "unused.ts": `export function unusedAudit() { appendActionModerationAudit(); }` },
    );
    const entry: ApiAuthorizationContractEntry = {
      expected: "audit",
      dimensions: ["audit"],
      actual: "PATCH must reach the audit owner",
      evidence: ["appendActionModerationAudit"],
      evidenceScope: "module",
    };

    expect(missingEvidence(entry, routeEntry, "PATCH")).toEqual(["appendActionModerationAudit"]);
  });

  it("does not follow an imported helper used only as a property key", () => {
    const routeEntry = buildInlineRouteEntry(
      `
        import { checkPermission } from "./permissions";
        export async function PATCH() {
          return Response.json({ checkPermission: false });
        }
      `,
      { "permissions.ts": `export function checkPermission() { canEditValidatedImpact(); appendActionModerationAudit(); }` },
    );
    const entry: ApiAuthorizationContractEntry = {
      expected: "validated impact correction and audit",
      dimensions: ["validated impact correction", "audit"],
      actual: "PATCH must not inherit a property key's helper body",
      evidence: ["canEditValidatedImpact", "appendActionModerationAudit"],
      evidenceScope: "module",
    };

    expect(missingEvidence(entry, routeEntry, "PATCH")).toEqual([
      "canEditValidatedImpact",
      "appendActionModerationAudit",
    ]);
  });

  it("does not follow an imported helper that is referenced but never called", () => {
    const routeEntry = buildInlineRouteEntry(
      `
        import { checkPermission } from "./permissions";
        export async function PATCH() {
          const permission = checkPermission;
          return Response.json({ permission });
        }
      `,
      { "permissions.ts": `export function checkPermission() { appendActionModerationAudit(); }` },
    );
    const entry: ApiAuthorizationContractEntry = {
      expected: "audit",
      dimensions: ["audit"],
      actual: "PATCH must call the imported audit owner",
      evidence: ["appendActionModerationAudit"],
      evidenceScope: "module",
    };

    expect(missingEvidence(entry, routeEntry, "PATCH")).toEqual(["appendActionModerationAudit"]);
  });

  it("does not follow a helper passed to Promise.resolve as a value", () => {
    const routeEntry = buildInlineRouteEntry(
      `
        import { checkPermission } from "./permissions";
        export async function PATCH() {
          return Response.json({ reference: String(Promise.resolve(checkPermission)) });
        }
      `,
      { "permissions.ts": `export function checkPermission() { canEditValidatedImpact(); appendActionModerationAudit(); }` },
    );
    const entry: ApiAuthorizationContractEntry = {
      expected: "validated impact correction and audit",
      dimensions: ["validated impact correction", "audit"],
      actual: "PATCH must not treat a serialized helper reference as execution",
      evidence: ["canEditValidatedImpact", "appendActionModerationAudit"],
      evidenceScope: "module",
    };

    expect(missingEvidence(entry, routeEntry, "PATCH")).toEqual([
      "canEditValidatedImpact",
      "appendActionModerationAudit",
    ]);
    expect(routeEntry.methodEvidenceSources?.get("PATCH")).not.toContain("canEditValidatedImpact");
  });

  it("does not follow a helper passed to an unknown function", () => {
    const routeEntry = buildInlineRouteEntry(
      `
        import { checkPermission } from "./permissions";
        declare function register(reference: unknown): void;
        export async function PATCH() {
          register(checkPermission);
          return Response.json({ ok: true });
        }
      `,
      { "permissions.ts": `export function checkPermission() { canEditValidatedImpact(); appendActionModerationAudit(); }` },
    );
    const entry: ApiAuthorizationContractEntry = {
      expected: "validated impact correction and audit",
      dimensions: ["validated impact correction", "audit"],
      actual: "PATCH must not infer callback execution from an unknown callee",
      evidence: ["canEditValidatedImpact", "appendActionModerationAudit"],
      evidenceScope: "module",
    };

    expect(missingEvidence(entry, routeEntry, "PATCH")).toEqual([
      "canEditValidatedImpact",
      "appendActionModerationAudit",
    ]);
    expect(routeEntry.methodEvidenceSources?.get("PATCH")).not.toContain("appendActionModerationAudit");
  });

  it("does not follow a helper stored as a property without an invocation", () => {
    const routeEntry = buildInlineRouteEntry(
      `
        import { checkPermission } from "./permissions";
        export async function PATCH() {
          const callbacks = { checkPermission };
          return Response.json({ callbacks });
        }
      `,
      { "permissions.ts": `export function checkPermission() { appendActionModerationAudit(); }` },
    );
    const entry: ApiAuthorizationContractEntry = {
      expected: "audit",
      dimensions: ["audit"],
      actual: "PATCH must execute the audit owner rather than store it",
      evidence: ["appendActionModerationAudit"],
      evidenceScope: "module",
    };

    expect(missingEvidence(entry, routeEntry, "PATCH")).toEqual(["appendActionModerationAudit"]);
    expect(routeEntry.methodEvidenceSources?.get("PATCH")).not.toContain("appendActionModerationAudit");
  });

  it("recognizes an alias that is actually invoked", () => {
    const routeEntry = buildInlineRouteEntry(
      `
        import { checkPermission } from "./permissions";
        export async function PATCH() {
          const guard = checkPermission;
          return guard();
        }
      `,
      { "permissions.ts": `export function checkPermission() { canEditValidatedImpact(); appendActionModerationAudit(); }` },
    );
    const entry: ApiAuthorizationContractEntry = {
      expected: "validated impact correction and audit",
      dimensions: ["validated impact correction", "audit"],
      actual: "PATCH invokes the aliased permission owner",
      evidence: ["canEditValidatedImpact", "appendActionModerationAudit"],
      evidenceScope: "module",
    };

    expect(missingEvidence(entry, routeEntry, "PATCH")).toEqual([]);
    expect(routeEntry.methodEvidenceSources?.get("PATCH")).toContain("canEditValidatedImpact");
  });

  it("recognizes a callback passed to a known callback-invoking method", () => {
    const routeEntry = buildInlineRouteEntry(
      `
        import { checkPermission } from "./permissions";
        export async function PATCH() {
          [checkPermission].forEach(checkPermission);
          return Response.json({ ok: true });
        }
      `,
      { "permissions.ts": `export function checkPermission() { canEditValidatedImpact(); appendActionModerationAudit(); }` },
    );
    const entry: ApiAuthorizationContractEntry = {
      expected: "validated impact correction and audit",
      dimensions: ["validated impact correction", "audit"],
      actual: "PATCH uses a callback contract that invokes the permission owner",
      evidence: ["canEditValidatedImpact", "appendActionModerationAudit"],
      evidenceScope: "module",
    };

    expect(missingEvidence(entry, routeEntry, "PATCH")).toEqual([]);
    expect(routeEntry.methodEvidenceSources?.get("PATCH")).toContain("appendActionModerationAudit");
  });

  it("follows an authenticated helper delegated through withServerRateLimit", () => {
    const routeEntry = buildInlineRouteEntry(
      `
        import { withServerRateLimit } from "./rate-limit";
        import { handleAuthenticatedPost } from "./authenticated-post";
        export async function POST(request: Request) {
          return withServerRateLimit(request, { limit: 3 }, () => handleAuthenticatedPost(request));
        }
      `,
      {
        "authenticated-post.ts": `
          export async function handleAuthenticatedPost() {
            const { userId } = await auth();
            if (!userId) return unauthorizedJsonResponse();
            return Response.json({ submittedByUserId: userId });
          }
        `,
        "rate-limit.ts": "export function withServerRateLimit(_request: Request, _options: unknown, handler: () => Promise<Response>) { return handler(); }",
      },
    );
    const entry: ApiAuthorizationContractEntry = {
      expected: "authenticated onboarding submission",
      dimensions: ["authentication", "ownership"],
      actual: "POST delegates to the authenticated rate-limited helper",
      evidence: ["auth()", "submittedByUserId"],
      evidenceScope: "module",
    };

    expect(missingEvidence(entry, routeEntry, "POST")).toEqual([]);
    expect(routeEntry.methodEvidenceSources?.get("POST")).toContain("submittedByUserId");
  });

  it("does not follow a guard that is only returned as a callback value", () => {
    const routeEntry = buildInlineRouteEntry(
      `
        import { withServerRateLimit } from "./rate-limit";
        import { handleAuthenticatedPost } from "./authenticated-post";
        export async function POST(request: Request) {
          return withServerRateLimit(request, { limit: 3 }, () => handleAuthenticatedPost);
        }
      `,
      {
        "authenticated-post.ts": `
          export async function handleAuthenticatedPost() {
            const { userId } = await auth();
            return Response.json({ submittedByUserId: userId });
          }
        `,
        "rate-limit.ts": "export function withServerRateLimit(_request: Request, _options: unknown, handler: () => Promise<Response>) { return handler(); }",
      },
    );
    const entry: ApiAuthorizationContractEntry = {
      expected: "reachable authentication",
      dimensions: ["authentication", "ownership"],
      actual: "POST must execute the authenticated helper",
      evidence: ["auth()", "submittedByUserId"],
      evidenceScope: "module",
    };

    expect(missingEvidence(entry, routeEntry, "POST")).toEqual(["auth()", "submittedByUserId"]);
    expect(routeEntry.methodEvidenceSources?.get("POST")).not.toContain("submittedByUserId");
  });
});

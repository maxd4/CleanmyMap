import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, relative } from "node:path";
import {
  type ApiAuthorizationContractEntry,
} from "@/lib/auth/api-authorization-contract";
import { assertNoApiAuthorizationContractKeyCollisions } from "@/lib/auth/api-authorization-contract.assembly";
import type { ApiAuthorizationContract } from "@/lib/auth/api-authorization-contract.types";
import {
  apiRoot,
  contractedApiFamilies,
  contractEntries,
  extractRouteMethods,
  walk,
} from "./api-boundary-analysis";
import {
  buildInlineRouteEntry,
  missingEvidence,
} from "./api-boundary-evidence-analysis";
import { resolveRouteMethods } from "./api-boundary-route-analysis";

function readRouteInventory() {
  return walk(apiRoot)
    .filter((path) => path.endsWith("route.ts"))
    .map((path) => {
      const route = relative(apiRoot, dirname(path)).replaceAll("\\", "/");
      const family = route.split("/")[0] ?? "";
      if (!contractedApiFamilies.has(family)) return null;

      const source = readFileSync(path, "utf8");
      const resolved = resolveRouteMethods(path, source);
      return { path, route, ...resolved };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

describe("API security boundaries", () => {
  it("audits every contracted route.ts method against the method-level contract", () => {
    const inventory = readRouteInventory();
    const discovered = inventory.flatMap(({ route, methods }) =>
      Array.from(methods.keys()).map((method) => `${route} ${method}`),
    );
    const declared = contractEntries().map(({ key }) => key);

    expect(new Set(declared)).toEqual(new Set(discovered));
    expect(declared).toHaveLength(discovered.length);
  });

  it("rejects duplicate route keys before fragment assembly", () => {
    const fragment = (routeKey: string) =>
      ({ [routeKey]: {} }) as ApiAuthorizationContract;

    expect(() =>
      assertNoApiAuthorizationContractKeyCollisions([
        { name: "first", contract: fragment("actions") },
        { name: "second", contract: fragment("actions") },
      ]),
    ).toThrow('Duplicate API authorization contract key "actions"');
  });

  it("keeps public-safe and authenticated/AuthZ decisions explicit per method", () => {
    const entries = contractEntries();
    const byKey = new Map(entries.map((entry) => [entry.key, entry.entry]));

    expect(entries.length).toBeGreaterThan(0);
    for (const { key, entry } of entries) {
      expect(entry.expected, `${key} needs an expected decision`).toBeTruthy();
      expect(entry.actual, `${key} needs runtime evidence description`).toBeTruthy();
      expect(entry.dimensions, `${key} needs authorization dimensions`).not.toHaveLength(0);
    }

    expect(byKey.get("actions/map GET")?.dimensions).toContain("public-safe");
    expect(byKey.get("actions/group-join GET")?.dimensions).toContain("public-safe");
    expect(byKey.get("actions/[actionId] PATCH")?.dimensions).toContain("authentication");
    expect(byKey.get("actions/[actionId] PATCH")?.dimensions).toContain("business permission");
  });

  it("requires handler evidence for every non-public contract entry", () => {
    const inventoryByRoute = new Map(
      readRouteInventory().map((entry) => [entry.route, entry]),
    );

    for (const { route, method, entry } of contractEntries()) {
      if (
        entry.dimensions.length === 1 &&
        entry.dimensions.includes("public-safe")
      ) {
        continue;
      }

      const routeEntry = inventoryByRoute.get(route);
      expect(routeEntry, `${route} ${method} is missing from route inventory`).toBeDefined();
      const methodSource = routeEntry?.methods.get(method);
      expect(methodSource, `${route} ${method} is missing from route.ts`).toBeDefined();

      for (const token of missingEvidence(entry, routeEntry!, method)) {
        expect.fail(`${route} ${method} missing guard evidence ${token}`);
      }

      if (entry.delegatesTo) {
        expect(methodSource).toMatch(
          new RegExp(`return\\s+${entry.delegatesTo}\\s*\\(`),
        );
      }
    }
  }, 30_000);

  it("recognizes a helper only when the HTTP method actually delegates to it", () => {
    const routeEntry = buildInlineRouteEntry(
      `
        import { preparePatchMutation } from "./patch";
        export async function PATCH() {
          return preparePatchMutation();
        }
      `,
      {
        "patch.ts": `
          export function preparePatchMutation() {
            canEditValidatedImpact();
            appendActionModerationAudit();
          }
        `,
      },
    );
    const entry: ApiAuthorizationContractEntry = {
      expected: "validated impact correction and audit",
      dimensions: ["validated impact correction", "audit"],
      actual: "PATCH delegates to the preparation owner",
      evidence: [
        "preparePatchMutation",
        "canEditValidatedImpact",
        "appendActionModerationAudit",
      ],
      evidenceScope: "module",
    };

    expect(missingEvidence(entry, routeEntry, "PATCH")).toEqual([]);
  });

  it("detects a removed audit call from an otherwise reachable helper", () => {
    const routeEntry = buildInlineRouteEntry(
      `
        import { preparePatchMutation } from "./patch";
        export async function PATCH() {
          return preparePatchMutation();
        }
      `,
      {
        "patch.ts": `
          export function preparePatchMutation() {
            canEditValidatedImpact();
          }
        `,
      },
    );
    const entry: ApiAuthorizationContractEntry = {
      expected: "validated impact correction and audit",
      dimensions: ["validated impact correction", "audit"],
      actual: "PATCH must retain both delegated protections",
      evidence: ["canEditValidatedImpact", "appendActionModerationAudit"],
      evidenceScope: "module",
    };

    expect(missingEvidence(entry, routeEntry, "PATCH")).toEqual([
      "appendActionModerationAudit",
    ]);
  });

  it("detects a removed validated-impact permission from a reachable helper", () => {
    const routeEntry = buildInlineRouteEntry(
      `
        import { preparePatchMutation } from "./patch";
        export async function PATCH() {
          return preparePatchMutation();
        }
      `,
      {
        "patch.ts": `
          export function preparePatchMutation() {
            appendActionModerationAudit();
          }
        `,
      },
    );
    const entry: ApiAuthorizationContractEntry = {
      expected: "validated impact correction and audit",
      dimensions: ["validated impact correction", "audit"],
      actual: "PATCH must retain both delegated protections",
      evidence: ["canEditValidatedImpact", "appendActionModerationAudit"],
      evidenceScope: "module",
    };

    expect(missingEvidence(entry, routeEntry, "PATCH")).toEqual([
      "canEditValidatedImpact",
    ]);
  });

  it("does not count a declaration, import, comment, or different HTTP method", () => {
    const routeEntry = buildInlineRouteEntry(
      `
        import { canEditValidatedImpact as importedPermission } from "./permissions";
        const canEditValidatedImpact = true;
        export async function GET() {
          return importedPermission();
        }
        export async function PATCH() {
          // canEditValidatedImpact is required here, but is not called.
          return new Response("ok");
        }
      `,
      {
        "permissions.ts": `export function canEditValidatedImpact() { return true; }`,
      },
    );
    const entry: ApiAuthorizationContractEntry = {
      expected: "validated impact correction",
      dimensions: ["validated impact correction"],
      actual: "PATCH must execute its own permission check",
      evidence: ["canEditValidatedImpact"],
      evidenceScope: "module",
    };

    expect(missingEvidence(entry, routeEntry, "PATCH")).toEqual([
      "canEditValidatedImpact",
    ]);
  });

  it("requires handler evidence to be an invocation inside the inspected handler", () => {
    const fixture = `
      export async function POST() {
        function requireActionRequestAccess() {}
        return Response.json({ guard: "requireActionRequestAccess" });
      }
    `;
    const routeEntry = {
      source: fixture,
      methods: extractRouteMethods(fixture),
    };
    const entry: ApiAuthorizationContractEntry = {
      expected: "authenticated access",
      dimensions: ["authentication"],
      actual: "POST must invoke its access guard",
      handlerEvidence: ["requireActionRequestAccess"],
      evidenceScope: "method",
    };

    expect(missingEvidence(entry, routeEntry, "POST")).toEqual([
      "requireActionRequestAccess",
    ]);
  });

  it("does not let GET or POST evidence satisfy PATCH", () => {
    const routeEntry = buildInlineRouteEntry(
      `
        import { getGuard, postAudit } from "./security";
        export async function GET() {
          return getGuard();
        }
        export async function POST() {
          return postAudit();
        }
        export async function PATCH() {
          return Response.json({ getGuard: false, postAudit: false });
        }
      `,
      {
        "security.ts": `
          export function getGuard() { canEditValidatedImpact(); }
          export function postAudit() { appendActionModerationAudit(); }
        `,
      },
    );
    const entry: ApiAuthorizationContractEntry = {
      expected: "PATCH security",
      dimensions: ["validated impact correction", "audit"],
      actual: "PATCH must have its own reachable security path",
      evidence: ["canEditValidatedImpact", "appendActionModerationAudit"],
      evidenceScope: "module",
    };

    expect(missingEvidence(entry, routeEntry, "PATCH")).toEqual([
      "canEditValidatedImpact",
      "appendActionModerationAudit",
    ]);
  });
});

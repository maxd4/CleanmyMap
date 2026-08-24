import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildAccessLinks } from "@/components/pilotage/access-screen/access-screen-constants";

const COMPONENTS_ROOT = path.dirname(fileURLToPath(import.meta.url));

const PAYLOAD_SOURCE_FILES = [
  path.join(COMPONENTS_ROOT, "pilotage/access-screen/access-screen-constants.ts"),
  path.resolve(COMPONENTS_ROOT, "../app/(app)/admin/page.tsx"),
  path.resolve(COMPONENTS_ROOT, "../app/(app)/reports/page.tsx"),
];

const CONTRACT_SOURCE_FILES = [
  path.join(COMPONENTS_ROOT, "ui/navigation-grid.tsx"),
  path.join(COMPONENTS_ROOT, "admin/admin-dashboard-ui.tsx"),
  path.join(COMPONENTS_ROOT, "ui/page-structure.tsx"),
];

const COMPONENT_VALUE_PATTERN = /\bicon\s*:\s*[A-Z][A-Za-z0-9]*\b/;
const COMPONENT_CONTRACT_PATTERN =
  /\bicon\??\s*:\s*(?:LucideIcon|ReactNode|React\.(?:ComponentType|ElementType))/;

function findNonSerializableValues(value: unknown, pathLabel = "payload"): string[] {
  if (typeof value === "function" || typeof value === "symbol") {
    return [pathLabel];
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findNonSerializableValues(item, `${pathLabel}[${index}]`),
    );
  }

  return Object.entries(value).flatMap(([key, nestedValue]) =>
    findNonSerializableValues(nestedValue, `${pathLabel}.${key}`),
  );
}

describe("RSC icon serialization boundary", () => {
  it("keeps server-built navigation payloads free of React components", async () => {
    const violations: string[] = [];

    for (const file of PAYLOAD_SOURCE_FILES) {
      const content = await readFile(file, "utf8");
      if (COMPONENT_VALUE_PATTERN.test(content)) {
        violations.push(path.relative(process.cwd(), file));
      }
    }

    expect(violations).toEqual([]);
  });

  it("exposes icon names rather than component-valued public contracts", async () => {
    const violations: string[] = [];

    for (const file of CONTRACT_SOURCE_FILES) {
      const content = await readFile(file, "utf8");
      if (COMPONENT_CONTRACT_PATTERN.test(content)) {
        violations.push(path.relative(process.cwd(), file));
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps pilotage access links JSON-serializable", () => {
    const links = buildAccessLinks("max", "fr");

    expect(links.every((link) => typeof link.icon === "string")).toBe(true);
    expect(findNonSerializableValues(links)).toEqual([]);
  });
});

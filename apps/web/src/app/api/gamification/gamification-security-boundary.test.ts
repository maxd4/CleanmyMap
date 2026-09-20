import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const webRoot = process.cwd();
const gamificationApiRoot = resolve(webRoot, "src/app/api/gamification");
const migrationPath = resolve(
  webRoot,
  "supabase/migrations/20260920000000_harden_gamification_projection_writes.sql",
);
const retiredRoutePaths = [
  "src/app/api/gamification/points/add/route.ts",
  "src/app/api/gamification/badges/[userId]/increment/route.ts",
];
const projectionTables = [
  "user_points",
  "points_ledger",
  "user_badge_totals",
  "badge_events",
  "user_visited_places",
];

function readWebFile(relativePath: string): string {
  return readFileSync(resolve(webRoot, relativePath), "utf8");
}

function listRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = join(directory, entry.name);
    return entry.isDirectory()
      ? listRouteFiles(filePath)
      : entry.name === "route.ts"
        ? [filePath]
        : [];
  });
}

describe("gamification security boundaries", () => {
  it("does not expose the retired self-attribution routes or helper", () => {
    for (const routePath of retiredRoutePaths) {
      expect(existsSync(resolve(webRoot, routePath)), routePath).toBe(false);
    }

    const apiSource = readWebFile("src/lib/gamification/api.ts");
    expect(apiSource).not.toContain("incrementBadge");
    expect(apiSource).not.toContain("BadgeIncrementType");
    expect(apiSource).not.toContain("/increment");
  });

  it("keeps user-facing gamification routes free of projection DML", () => {
    const projectionWritePattern = new RegExp(
      `\\.from\\(\\s*["'](?:${projectionTables.join("|")})["']\\s*\\)[\\s\\S]{0,500}\\.(?:insert|update|upsert|delete)\\s*\\(`,
    );

    for (const routePath of listRouteFiles(gamificationApiRoot)) {
      const source = readFileSync(routePath, "utf8");
      expect(source, routePath).not.toMatch(projectionWritePattern);
    }
  });

  it("keeps all audited projections server-owned in the append-only migration", () => {
    const migration = readFileSync(migrationPath, "utf8");

    for (const table of projectionTables) {
      expect(migration).toMatch(
        new RegExp(
          `revoke insert, update, delete, truncate on table public\\.${table} from public, anon, authenticated;`,
        ),
      );
      expect(migration).toMatch(
        new RegExp(`alter table public\\.${table} enable row level security;`),
      );
    }

    expect(migration).toContain(
      "create policy gamification_user_visited_places_owner_select",
    );
    expect(migration).toContain("for select");
    expect(migration).not.toMatch(/create policy[\s\S]+for\s+(?:all|insert|update|delete)/i);
  });
});

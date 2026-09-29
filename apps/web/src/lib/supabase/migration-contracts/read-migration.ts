import { readFileSync } from "node:fs";

export function readMigration(baseUrl: string | URL, name: string): string {
  return readFileSync(new URL(`../../../../supabase/migrations/${name}`, baseUrl), "utf8")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));

describe("root layout cache contract", () => {
  it("does not impose a time-based revalidation on every route", () => {
    const source = fs.readFileSync(path.join(appDirectory, "layout.tsx"), "utf8");

    expect(source).not.toMatch(/export const revalidate\s*=/);
  });
});

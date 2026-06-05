import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("quiz SRS service", () => {
  it("selects explicit columns instead of loading the full row", () => {
    const source = readFileSync(new URL("./quiz-srs-service.ts", import.meta.url), "utf8");

    expect(source).toContain(
      '.select("question_id, last_seen_at, next_review_at, success_count, failure_count, streak, ease_factor, mastery_level")',
    );
    expect(source).not.toContain('.select("*")');
  });
});


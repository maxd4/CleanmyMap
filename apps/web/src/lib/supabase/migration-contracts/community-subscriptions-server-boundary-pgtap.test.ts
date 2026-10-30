import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pgtap = readFileSync(
  new URL("../../../../supabase/tests/community-subscriptions-server-boundary.pgtap.sql", import.meta.url),
  "utf8",
).replaceAll("\r\n", "\n");

describe("community subscription server boundary pgTAP [STATIC_CONTRACT]", () => {
  it("keeps the 20-assertion plan executable and isolates the final owner read", () => {
    const outsiderConfig = `select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"subscription-outsider"}',
  true
);`;
    const outsiderConfigIndex = pgtap.indexOf(outsiderConfig);
    const isolationAssertionIndex = pgtap.indexOf(
      "another authenticated member cannot read the private subscription",
    );

    expect(pgtap).toContain("select plan(20);");
    expect(outsiderConfigIndex).toBeGreaterThan(-1);
    expect(outsiderConfigIndex).toBeLessThan(isolationAssertionIndex);
    expect(pgtap).not.toContain(`\nset_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"subscription-outsider"}',
  true
);`);
  });
});

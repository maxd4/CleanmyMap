import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXPLICIT_PENDING_WORKLOAD_INDEXES,
  PERFORMANCE_ADVISOR_COMMAND_OPTIONS,
  RECENT_FK_PROTECTION_INDEXES,
  formatPerformanceAdvisorSummary,
  parsePerformanceAdvisorArgs,
  parsePerformanceAdvisorOutput,
  renderPerformanceAdvisorOutput,
  summarizePerformanceAdvisorOutput,
} from "../../../scripts/supabase-performance-advisors.mjs";

function unusedIndexFinding(index: string, table = "app_messages", extra: Record<string, unknown> = {}) {
  return {
    name: "unused_index",
    level: "INFO",
    title: `Index ${index} has not been used`,
    detail: `Index ${index} on public.${table} has not been observed as used`,
    metadata: { name: index, type: "index", schema: "public", table, ...extra },
  };
}

function currentPerformancePayload() {
  const recent = RECENT_FK_PROTECTION_INDEXES.map((entry) =>
    unusedIndexFinding(entry.name, entry.table, { columns: entry.columns }),
  );
  const pending = EXPLICIT_PENDING_WORKLOAD_INDEXES.map((entry) =>
    unusedIndexFinding(entry.name, entry.table),
  );
  const other = Array.from({ length: 72 }, (_, index) =>
    unusedIndexFinding(`idx_other_${String(index + 1).padStart(2, "0")}`),
  );
  return [...recent, ...pending, ...other];
}

describe("Supabase performance advisor normalization", () => {
  it("summarizes 81 unused_index INFO findings without listing the payload", () => {
    const payload = JSON.stringify(currentPerformancePayload());
    const summary = summarizePerformanceAdvisorOutput(payload);
    const output = formatPerformanceAdvisorSummary(summary);

    expect(summary.status).toBe("PASS");
    expect(summary.performanceError).toBe(0);
    expect(summary.performanceWarn).toBe(0);
    expect(summary.unusedIndexInfo).toBe(81);
    expect(summary.recentFkProtection).toBe(6);
    expect(summary.explicitPendingWorkload).toBe(3);
    expect(summary.otherNeedsWorkloadEvidence).toBe(72);
    expect(summary.immediateIndexRemoval).toBe(0);
    expect(output).toContain("PERFORMANCE_ERROR: 0");
    expect(output).toContain("PERFORMANCE_WARN: 0");
    expect(output).toContain("UNUSED_INDEX_INFO: 81");
    expect(output).toContain("RECENT_FK_PROTECTION: 6");
    expect(output).toContain("EXPLICIT_PENDING_WORKLOAD: 3");
    expect(output).toContain("OTHER_NEEDS_WORKLOAD_EVIDENCE: 72");
    expect(output).toContain("IMMEDIATE_INDEX_REMOVAL: 0");
    expect(output).not.toContain("idx_other_01");
    expect(output).not.toContain("PERFORMANCE_FINDINGS:");
  });

  it("keeps the validated original payload available through --raw", () => {
    const payload = JSON.stringify(currentPerformancePayload());
    expect(parsePerformanceAdvisorArgs(["--linked", "--raw"])).toEqual({ mode: "linked", raw: true });
    expect(renderPerformanceAdvisorOutput(payload, { raw: true })).toBe(payload);
  });

  it("classifies the six recent foreign-key protection indexes", () => {
    const summary = summarizePerformanceAdvisorOutput(
      JSON.stringify(RECENT_FK_PROTECTION_INDEXES.map((entry) =>
        unusedIndexFinding(entry.name, entry.table, { columns: entry.columns }),
      )),
    );

    expect(summary.recentFkProtection).toBe(6);
    expect(summary.explicitPendingWorkload).toBe(0);
    expect(summary.status).toBe("PASS");
  });

  it("classifies the three explicitly pending workload indexes", () => {
    const summary = summarizePerformanceAdvisorOutput(
      JSON.stringify(EXPLICIT_PENDING_WORKLOAD_INDEXES.map((entry) => unusedIndexFinding(entry.name, entry.table))),
    );

    expect(summary.explicitPendingWorkload).toBe(3);
    expect(summary.recentFkProtection).toBe(0);
    expect(summary.status).toBe("PASS");
  });

  it("keeps WARN and ERROR findings visible and blocking", () => {
    const warning = unusedIndexFinding("idx_warning");
    warning.level = "WARN";
    const payload = JSON.stringify([
      warning,
      { name: "extension_in_public", level: "ERROR", title: "Extension installed in public schema" },
    ]);
    const summary = summarizePerformanceAdvisorOutput(payload);
    const output = formatPerformanceAdvisorSummary(summary);

    expect(summary.status).toBe("FAIL");
    expect(output).toContain("PERFORMANCE_ERROR: 1");
    expect(output).toContain("PERFORMANCE_WARN: 1");
    expect(output).toContain("PERFORMANCE_NEEDS_ANALYSIS: 2");
    expect(output).toContain("idx_warning");
    expect(output).toContain("extension_in_public");
  });

  it("does not absorb a new Performance Advisor type", () => {
    const payload = JSON.stringify([
      ...currentPerformancePayload(),
      { name: "table_bloat", level: "INFO", title: "Table bloat requires analysis" },
    ]);
    const output = renderPerformanceAdvisorOutput(payload);

    expect(output).toContain("PERFORMANCE_STATUS: FAIL");
    expect(output).toContain("PERFORMANCE_NEEDS_ANALYSIS: 1");
    expect(output).toContain("table_bloat");
  });

  it("fails closed when a protected index identity changes", () => {
    const finding = unusedIndexFinding(RECENT_FK_PROTECTION_INDEXES[0].name, "unexpected_table", {
      columns: RECENT_FK_PROTECTION_INDEXES[0].columns,
    });
    const output = renderPerformanceAdvisorOutput(JSON.stringify([finding]));

    expect(output).toContain("PERFORMANCE_STATUS: FAIL");
    expect(output).toContain("metadata.table=unexpected_table");
    expect(output).toContain(RECENT_FK_PROTECTION_INDEXES[0].name);
  });

  it("does not contain or request automatic DROP INDEX behavior", () => {
    const script = readFileSync(resolve(process.cwd(), "scripts/supabase-performance-advisors.mjs"), "utf8");
    expect(script).not.toMatch(/drop\s+index/i);
    expect(renderPerformanceAdvisorOutput(JSON.stringify(currentPerformancePayload()))).toContain(
      "IMMEDIATE_INDEX_REMOVAL: 0",
    );
    expect(PERFORMANCE_ADVISOR_COMMAND_OPTIONS).toEqual([
      "--type",
      "performance",
      "--level",
      "info",
      "--fail-on",
      "none",
      "--output-format",
      "json",
    ]);
  });

  it("fails closed for non-JSON Performance Advisor output", () => {
    expect(() => parsePerformanceAdvisorOutput("unexpected text")).toThrow("did not return JSON");
    expect(() => renderPerformanceAdvisorOutput("unexpected text")).toThrow("did not return JSON");
  });
});

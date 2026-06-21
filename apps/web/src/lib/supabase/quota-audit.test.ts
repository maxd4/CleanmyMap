import { describe, expect, it } from "vitest";
import { analyzeFile, buildReport, formatMarkdownReport } from "../../../scripts/supabase-quota-audit.mjs";

type SupabaseQuotaFinding = {
  type: string;
  resource: string;
  file: string;
  line: number;
  message: string;
};

type SupabaseQuotaFileReport = {
  findings: SupabaseQuotaFinding[];
  useEffectNetworkHits: Array<{ file: string; line: number; snippet: string }>;
};

describe("supabase quota audit", () => {
  it("detects select star, unbounded reads, storage ops and mount-triggered network calls", () => {
    const filePath = "src/components/sample.tsx";
    const source = `
"use client";
import { useEffect } from "react";

export function Sample({ supabase }: { supabase: any }) {
  useEffect(() => {
    void supabase.from("profiles").select("*");
    void supabase.storage.from("chat-attachments").upload("demo.png", new Blob());
  }, []);

  return null;
}
`;

    const report = analyzeFile(filePath, process.cwd(), source) as SupabaseQuotaFileReport;
    expect(report.findings.some((finding) => finding.type === "select_star")).toBe(true);
    expect(report.findings.some((finding) => finding.type === "unbounded_select")).toBe(true);
    expect(report.findings.some((finding) => finding.type === "storage")).toBe(true);
    expect(report.useEffectNetworkHits.length).toBeGreaterThan(0);
  });

  it("flags unguarded realtime in chat surfaces", () => {
    const report = analyzeFile(
      "src/components/chat/hooks/use-chat-data.ts",
      process.cwd(),
      `
"use client";
export function useChatData({ supabase }: { supabase: any }) {
  supabase.channel("chat-updates").subscribe();
  return null;
}
`,
    ) as SupabaseQuotaFileReport;

    expect(
      report.findings.some((finding) => finding.type === "realtime_chat_unflagged"),
    ).toBe(true);
  });

  it("builds a markdown report with table and file summaries", () => {
    const fileReports = [
      analyzeFile(
        "src/components/sample.tsx",
        process.cwd(),
        `
export async function load(supabase: any) {
  await supabase.from("actions").select("id").limit(10);
}
`,
      ),
    ];

    const summary = buildReport(process.cwd(), fileReports);
    const markdown = formatMarkdownReport(summary);

    expect(markdown).toContain("## Top tables");
    expect(markdown).toContain("`actions`");
    expect(markdown).toContain("## Highest-risk files");
  });
});

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CodexUsagePanel } from "./codex-usage-panel";
import {
  calculateAverageWeeklyKg,
  serializeCodexUsageForm,
  type CodexUsageFormState,
} from "./codex-usage-panel.model";

describe("CodexUsagePanel", () => {
  it("renders the weekly Codex journal controls", () => {
    const markup = renderToStaticMarkup(React.createElement(CodexUsagePanel));

    expect(markup).toContain("Journal Codex hebdomadaire");
    expect(markup).toContain("Enregistrer la semaine");
    expect(markup).toContain("Sessions");
    expect(markup).toContain("Historique");
    expect(markup).toContain("Aucun journal Codex");
  });

  it("serializes non-negative metrics and trimmed notes for the API", () => {
    const form: CodexUsageFormState = {
      weekStart: "2026-09-14",
      weekEnd: "2026-09-20",
      sessionCount: "4",
      conversationCount: "-1",
      turnCount: "not-a-number",
      toolCallCount: "2.5",
      shellCommandCount: "0",
      fileTouchCount: "3",
      testRunCount: "1",
      changedLineCount: "8",
      activeMinutes: "45",
      source: "imported",
      notes: " first note \n\nsecond note  ",
    };

    expect(serializeCodexUsageForm(form)).toEqual({
      weekStart: "2026-09-14",
      weekEnd: "2026-09-20",
      sessionCount: 4,
      conversationCount: 0,
      turnCount: 0,
      toolCallCount: 2.5,
      shellCommandCount: 0,
      fileTouchCount: 3,
      testRunCount: 1,
      changedLineCount: 8,
      activeMinutes: 45,
      source: "imported",
      notes: ["first note", "second note"],
    });
  });

  it("derives the weekly average from the aggregate window", () => {
    expect(calculateAverageWeeklyKg({ estimatedKgCo2eProxy: 18, windowWeeks: 4 })).toBe(4.5);
    expect(calculateAverageWeeklyKg({ estimatedKgCo2eProxy: 18, windowWeeks: 0 })).toBe(18);
    expect(calculateAverageWeeklyKg(null)).toBeNull();
  });
});

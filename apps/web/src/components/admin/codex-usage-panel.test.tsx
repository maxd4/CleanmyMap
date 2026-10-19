import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CodexUsagePanel, DeferredCodexUsagePanel } from "./codex-usage-panel";
import {
  calculateAverageWeeklyKg,
  serializeCodexUsageForm,
  type CodexUsageFormState,
} from "./codex-usage-panel.model";

describe("CodexUsagePanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not mount the Codex data panel before explicit consultation", () => {
    const markup = renderToStaticMarkup(React.createElement(DeferredCodexUsagePanel));

    expect(markup).toContain("Consulter le suivi Codex");
    expect(markup).not.toContain("Enregistrer la semaine");
    expect(markup).not.toContain("Aucun journal Codex");
  });

  it("reads once after consultation and keeps the result mounted across reopen", () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ snapshots: [] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<DeferredCodexUsagePanel />);
    });
    expect(fetchMock).not.toHaveBeenCalled();

    const openButton = renderer.root
      .findAllByType("button")
      .find((button) => String(button.props.children).includes("Consulter"));
    act(() => openButton?.props.onClick());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/codex-usage?historyLimit=12",
      { headers: { Accept: "application/json" } },
    );

    const hideButton = renderer.root
      .findAllByType("button")
      .find((button) => String(button.props.children).includes("Masquer"));
    act(() => hideButton?.props.onClick());
    const reopenButton = renderer.root
      .findAllByType("button")
      .find((button) => String(button.props.children).includes("Consulter"));
    act(() => reopenButton?.props.onClick());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

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

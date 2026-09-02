import { describe, expect, it } from "vitest";

import { parseQuizSentrainerEntryState } from "./quiz-entry-state";

describe("parseQuizSentrainerEntryState", () => {
  it("defaults to an undecided entry state", () => {
    expect(parseQuizSentrainerEntryState(new URLSearchParams())).toEqual({
      initialAccessType: null,
      initialDemoMode: false,
      initialSchoolLevel: null,
      initialSchoolFormat: null,
      initialSchoolTrack: null,
      initialCollectiveMode: true,
    });
  });

  it("opens the demo directly when requested", () => {
    expect(parseQuizSentrainerEntryState(new URLSearchParams({ mode: "demo" }))).toEqual({
      initialAccessType: "mixte",
      initialDemoMode: true,
      initialSchoolLevel: null,
      initialSchoolFormat: null,
      initialSchoolTrack: null,
      initialCollectiveMode: true,
    });
  });

  it("opens the school workshop directly with a track", () => {
    expect(
      parseQuizSentrainerEntryState(new URLSearchParams({ mode: "ecole", track: "debat-classe", collective: "0" })),
    ).toEqual({
      initialAccessType: "ecole",
      initialDemoMode: false,
      initialSchoolLevel: "4e",
      initialSchoolFormat: "quiz-30",
      initialSchoolTrack: "debat-classe",
      initialCollectiveMode: false,
    });
  });

  it.each(["6e", "5e", "4e", "3e"] as const)("accepts the school level %s", (level) => {
    expect(parseQuizSentrainerEntryState(new URLSearchParams({ mode: "ecole", level }))).toMatchObject({
      initialAccessType: "ecole",
      initialSchoolLevel: level,
      initialSchoolFormat: "quiz-30",
    });
  });

  it("parses the workshop format without putting answers in the URL state", () => {
    expect(parseQuizSentrainerEntryState(new URLSearchParams({ mode: "ecole", level: "5e", format: "atelier-60" }))).toMatchObject({
      initialAccessType: "ecole",
      initialSchoolLevel: "5e",
      initialSchoolFormat: "atelier-60",
    });
  });

  it("falls back to the 30-minute quiz for an invalid or missing format", () => {
    expect(parseQuizSentrainerEntryState(new URLSearchParams({ mode: "ecole", format: "unknown" }))).toMatchObject({
      initialSchoolFormat: "quiz-30",
    });
  });

  it("keeps demo links independent from the school format", () => {
    expect(parseQuizSentrainerEntryState(new URLSearchParams({ mode: "demo", format: "atelier-60" }))).toMatchObject({
      initialAccessType: "mixte",
      initialDemoMode: true,
      initialSchoolFormat: null,
    });
  });

  it("falls back safely for a missing or invalid school level", () => {
    expect(parseQuizSentrainerEntryState(new URLSearchParams({ mode: "ecole", level: "6eme" }))).toMatchObject({
      initialAccessType: "ecole",
      initialSchoolLevel: "4e",
      initialSchoolFormat: "quiz-30",
    });
  });
});

import { describe, expect, it } from "vitest";

import { parseQuizSentrainerEntryState } from "./quiz-entry-state";

describe("parseQuizSentrainerEntryState", () => {
  it("defaults to an undecided entry state", () => {
    expect(parseQuizSentrainerEntryState(new URLSearchParams())).toEqual({
      initialAccessType: null,
      initialDemoMode: false,
      initialSchoolLevel: null,
      initialSchoolTrack: null,
      initialCollectiveMode: true,
    });
  });

  it("opens the demo directly when requested", () => {
    expect(parseQuizSentrainerEntryState(new URLSearchParams({ mode: "demo" }))).toEqual({
      initialAccessType: "mixte",
      initialDemoMode: true,
      initialSchoolLevel: null,
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
      initialSchoolTrack: "debat-classe",
      initialCollectiveMode: false,
    });
  });

  it.each(["6e", "5e", "4e", "3e"] as const)("accepts the school level %s", (level) => {
    expect(parseQuizSentrainerEntryState(new URLSearchParams({ mode: "ecole", level }))).toMatchObject({
      initialAccessType: "ecole",
      initialSchoolLevel: level,
    });
  });

  it("falls back safely for a missing or invalid school level", () => {
    expect(parseQuizSentrainerEntryState(new URLSearchParams({ mode: "ecole", level: "6eme" }))).toMatchObject({
      initialAccessType: "ecole",
      initialSchoolLevel: "4e",
    });
  });
});

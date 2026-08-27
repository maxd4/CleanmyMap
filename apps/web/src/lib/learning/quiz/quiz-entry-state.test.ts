import { describe, expect, it } from "vitest";

import { parseQuizSentrainerEntryState } from "./quiz-entry-state";

describe("parseQuizSentrainerEntryState", () => {
  it("defaults to an undecided entry state", () => {
    expect(parseQuizSentrainerEntryState(new URLSearchParams())).toEqual({
      initialAccessType: null,
      initialDemoMode: false,
      initialSchoolTrack: null,
      initialCollectiveMode: true,
    });
  });

  it("opens the demo directly when requested", () => {
    expect(parseQuizSentrainerEntryState(new URLSearchParams({ mode: "demo" }))).toEqual({
      initialAccessType: "mixte",
      initialDemoMode: true,
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
      initialSchoolTrack: "debat-classe",
      initialCollectiveMode: false,
    });
  });
});

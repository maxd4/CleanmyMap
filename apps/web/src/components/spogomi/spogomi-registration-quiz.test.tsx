import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SpogomiRegistrationQuiz } from "./spogomi-registration-quiz";

describe("SpogomiRegistrationQuiz", () => {
  it("communicates the critical threshold, retries and optional cleanwalk experience", () => {
    const markup = renderToStaticMarkup(<SpogomiRegistrationQuiz eventId="event-1" divisionId="division-1" divisionLabel="Casual" onPassed={() => undefined} />);
    expect(markup).toContain("Quiz obligatoire");
    expect(markup).toContain("toutes les questions critiques");
    expect(markup).toContain("cleanwalk");
  });
});

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { QuizSchoolPicker } from "./quiz-school-picker";

describe("QuizSchoolPicker", () => {
  it("shows a link to the school workshop kit", () => {
    const markup = renderToStaticMarkup(
      React.createElement(QuizSchoolPicker, {
        locale: "fr",
        collectiveMode: true,
        onToggleCollectiveMode: () => undefined,
        onLaunchSchoolSession: () => undefined,
        onBackToAccessType: () => undefined,
      }),
    );

    expect(markup).toContain("Mode École");
    expect(markup).toContain("Voir le kit enseignant");
    expect(markup).toContain("Mode collectif activé");
    expect(markup).toContain("6e");
    expect(markup).toContain("5e");
    expect(markup).toContain("4e");
    expect(markup).toContain("3e");
    expect(markup).not.toContain("onSelectSchoolLevel");
  });
});

import * as React from "react";

export function createLearnSitePreferencesModule() {
  return {
    useSitePreferences: () => ({ locale: "fr" }),
  };
}

export function createLearnRubricShellModule() {
  return {
    LearnRubricShell: ({
      title,
      subtitle,
      children,
    }: {
      title?: { fr: string; en: string };
      subtitle?: { fr: string; en: string };
      children: React.ReactNode;
    }) =>
      React.createElement(
        "div",
        { "data-testid": "shell" },
        title ? React.createElement("h1", null, title.fr) : null,
        subtitle ? React.createElement("p", null, subtitle.fr) : null,
        children,
      ),
  };
}

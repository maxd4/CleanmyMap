import * as React from "react";

export function createLearnSitePreferencesModule() {
  return {
    useSitePreferences: () => ({ locale: "fr" }),
  };
}

export function createLearnRubricShellModule() {
  return {
    LearnRubricShell: ({
      children,
      staticIntro,
    }: {
      children: React.ReactNode;
      staticIntro?: React.ReactNode;
    }) => React.createElement("div", { "data-testid": "shell" }, staticIntro, children),
  };
}

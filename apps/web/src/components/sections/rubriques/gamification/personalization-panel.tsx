type PersonalizationSnapshot = {
  localeLabel: string;
  themeLabel: string;
  displayModeLabel: string;
  displayModeHint: string;
};

export function buildPersonalizationSnapshot(
  locale: string,
  theme: string,
  displayMode: string,
): PersonalizationSnapshot {
  const fr = locale === "fr";
  const normalizedTheme = theme === "dark" ? "dark" : "mixed";
  const normalizedDisplayMode =
    displayMode === "minimaliste"
      ? "minimaliste"
      : displayMode === "sobre"
        ? "sobre"
        : "exhaustif";

  return {
    localeLabel: fr ? "Français" : "English",
    themeLabel:
      normalizedTheme === "dark" ? (fr ? "Sombre" : "Dark") : fr ? "Mixte" : "Mixed",
    displayModeLabel:
      normalizedDisplayMode === "exhaustif"
        ? fr
          ? "Exhaustif"
          : "Exhaustive"
        : normalizedDisplayMode === "minimaliste"
          ? fr
            ? "Minimaliste"
            : "Minimal"
          : fr
            ? "Sobre"
            : "Calm",
    displayModeHint:
      normalizedDisplayMode === "exhaustif"
        ? fr
          ? "Charte premium complète active"
          : "Full premium experience active"
        : normalizedDisplayMode === "sobre"
          ? fr
            ? "Police système locale active"
            : "Local system font active"
          : fr
            ? "Affichage simplifié actif"
            : "Simplified display active",
  };
}

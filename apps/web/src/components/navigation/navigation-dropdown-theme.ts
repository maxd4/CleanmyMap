import type { NavigationBlockId } from "@/lib/navigation";
import type { Locale } from "@/lib/ui/preferences";
type NavigationDropdownTheme = {
  backgroundColor: string;
  backgroundImage: string;
  borderColor: string;
};

const NAVIGATION_DROPDOWN_THEMES: Record<NavigationBlockId, NavigationDropdownTheme> = {
  home: {
    backgroundColor: "#fff7ed",
    backgroundImage:
      "linear-gradient(135deg, rgba(255,247,237,0.98) 0%, rgba(255,237,213,0.96) 48%, rgba(249,115,22,0.88) 100%)",
    borderColor: "rgba(194, 65, 12, 0.18)",
  },
  act: {
    backgroundColor: "#ecfdf5",
    backgroundImage:
      "linear-gradient(135deg, rgba(236,253,245,0.98) 0%, rgba(209,250,229,0.96) 52%, rgba(34,197,94,0.88) 100%)",
    borderColor: "rgba(22, 163, 74, 0.18)",
  },
  visualize: {
    backgroundColor: "#ffffff",
    backgroundImage:
      "linear-gradient(90deg, rgba(206,244,255,0.86) 0%, rgba(255,255,255,0.98) 38%, rgba(255,238,241,0.88) 100%)",
    borderColor: "rgba(125, 211, 252, 0.36)",
  },
  impact: {
    backgroundColor: "#fee2e2",
    backgroundImage:
      "linear-gradient(135deg, rgba(254,226,226,0.98) 0%, rgba(252,165,165,0.96) 52%, rgba(244,63,94,0.88) 100%)",
    borderColor: "rgba(239, 68, 68, 0.18)",
  },
  network: {
    backgroundColor: "#f5f3ff",
    backgroundImage:
      "linear-gradient(135deg, rgba(245,243,255,0.98) 0%, rgba(196,181,253,0.96) 52%, rgba(244,114,182,0.92) 100%)",
    borderColor: "rgba(139, 92, 246, 0.18)",
  },
  connect: {
    backgroundColor: "#fdf2f8",
    backgroundImage:
      "linear-gradient(135deg, rgba(250,245,255,0.98) 0%, rgba(221,214,254,0.96) 46%, rgba(251,113,133,0.92) 100%)",
    borderColor: "rgba(168, 85, 247, 0.18)",
  },
  learn: {
    backgroundColor: "#fef9c3",
    backgroundImage:
      "linear-gradient(135deg, rgba(254,249,195,0.98) 0%, rgba(253,224,71,0.96) 52%, rgba(245,158,11,0.88) 100%)",
    borderColor: "rgba(202, 138, 4, 0.18)",
  },
  pilot: {
    backgroundColor: "#fff7ed",
    backgroundImage:
      "linear-gradient(135deg, rgba(255,247,237,0.98) 0%, rgba(254,215,170,0.96) 50%, rgba(194,116,38,0.90) 100%)",
    borderColor: "rgba(180, 83, 9, 0.18)",
  },
};

export function getNavigationDropdownPanelStyle(spaceId: NavigationBlockId | null) {
  const theme = NAVIGATION_DROPDOWN_THEMES[spaceId ?? "home"];

  return {
    backgroundColor: theme.backgroundColor,
    backgroundImage: theme.backgroundImage,
    borderColor: theme.borderColor,
    color: "#000000",
  } as const;
}

export function getNavigationDropdownTitleLabel(locale: Locale, label: string): string {
  return locale === "fr" ? `Bloc : ${label}` : `Block: ${label}`;
}

export type ClerkAccessMode = "visible" | "disabled" | "blur";

const SECTION_ACCESS_MODES: Record<string, ClerkAccessMode> = {
  guide: "visible",
  kit: "visible",
  climate: "visible",
  weather: "visible",
  route: "visible",
  recycling: "visible",
  sandbox: "visible",
  "open-data": "visible",
  funding: "visible",
  actors: "visible",
  annuaire: "disabled",
  community: "disabled",
  gamification: "disabled",
  elus: "disabled",
  messagerie: "blur",
  "trash-spotter": "blur",
};

const ROUTE_ACCESS_RULES: Array<{
  pattern: RegExp;
  mode: ClerkAccessMode;
}> = [
  { pattern: /^\/dashboard$/, mode: "blur" },
  { pattern: /^\/actions\/new$/, mode: "blur" },
  { pattern: /^\/actions\/history$/, mode: "blur" },
  { pattern: /^\/signalement$/, mode: "blur" },
  { pattern: /^\/profil(?:\/.*)?$/, mode: "blur" },
  { pattern: /^\/parcours(?:\/.*)?$/, mode: "blur" },
  { pattern: /^\/partners\/onboarding$/, mode: "blur" },
  { pattern: /^\/prints\/report$/, mode: "blur" },
  { pattern: /^\/admin(?:\/.*)?$/, mode: "blur" },
  { pattern: /^\/actions\/map$/, mode: "disabled" },
  { pattern: /^\/partners\/dashboard$/, mode: "disabled" },
  { pattern: /^\/partners\/network$/, mode: "disabled" },
  { pattern: /^\/sponsor-portal$/, mode: "disabled" },
  { pattern: /^\/reports$/, mode: "visible" },
  { pattern: /^\/learn\/hub$/, mode: "visible" },
  { pattern: /^\/observatoire$/, mode: "visible" },
  { pattern: /^\/methodologie$/, mode: "visible" },
];

export function getSectionClerkAccessMode(sectionId: string): ClerkAccessMode {
  return SECTION_ACCESS_MODES[sectionId] ?? "visible";
}

export function getAppRouteClerkAccessMode(pathname: string): ClerkAccessMode {
  const normalizedPath = pathname.trim();
  const match = ROUTE_ACCESS_RULES.find((rule) => rule.pattern.test(normalizedPath));
  return match?.mode ?? "visible";
}

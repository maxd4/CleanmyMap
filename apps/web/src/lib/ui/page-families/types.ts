import type { BackdropToneKey } from "@/lib/ui/backdrop-tone";
import type { RubriqueTheme } from "@/components/ui/rubrique-card";

/** Identifiants alignés sur `documentation/pages_site/routes/`. */
export type PageFamilyId =
  | "homepage"
  | "accueil-pilotage"
  | "agir"
  | "cartographie-impact"
  | "reseau-discussions"
  | "apprendre"
  | "authentification"
  | "juridique"
  | "systeme"
  | "administration"
  | "impression"
  | "secours";

export type PageFamilyHeroTokens = {
  eyebrow: string;
  title: string;
  /** Alias de compatibilité: même géométrie canonique que `title`. */
  titleCompact: string;
  subtitle: string;
  badge: string;
  badgeMuted: string;
  sectionGradient: string;
  iconWrap: string;
  icon: string;
};

/** Cartes rubrique / grands blocs (RubriqueCard, FamilyRubriqueCard). */
export type PageFamilyCardTokens = {
  rubriqueTheme: RubriqueTheme;
  shell: string;
  shellHover?: string;
  topBarAccent: RubriqueTheme;
  titleOnCard: string;
  textOnCard: string;
  textMutedOnCard: string;
};

export type PageFamilyDefinition = {
  id: PageFamilyId;
  /** Libellé documentaire (audit / debug). */
  label: string;
  backdropToneKey: BackdropToneKey;
  hero: PageFamilyHeroTokens;
  card: PageFamilyCardTokens;
};

export type PageFamilyRouteException = {
  id: string;
  /** Raison documentée (ex. sommaire, méthodologie). */
  note: string;
  match: (pathname: string) => boolean;
  familyId: PageFamilyId;
};

export type ResolvedPageFamily = PageFamilyDefinition & {
  exceptionId?: string;
};

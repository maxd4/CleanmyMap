import type { Locale } from "@/lib/ui/preferences";
import type {
  Espace,
  PageRoute,
  RubriqueKind as DomainRubriqueKind,
} from "@/lib/domain-language";

export type LocalizedText = Record<Locale, string>;

export type RubriqueCategory = {
  id: "pilotage" | "terrain" | "analysis" | "resources" | "community";
  label: LocalizedText;
};

export type RubriqueAvailability = "available" | "hidden";
export type RubriqueKind = DomainRubriqueKind;
export type RubriqueImplementation = "finalized" | "pending";
export type RubriqueSpaceId = Espace;

export type RubriqueDefinition = {
  id: string;
  categoryId: RubriqueCategory["id"];
  spaceId: RubriqueSpaceId;
  priority: number;
  kind: RubriqueKind;
  route: PageRoute;
  label: LocalizedText;
  description: LocalizedText;
  availability: RubriqueAvailability;
  implementation: RubriqueImplementation;
  pendingNote?: LocalizedText;
};

import { RUBRIQUE_REGISTRY } from "./config";

export type Rubrique = (typeof RUBRIQUE_REGISTRY)[number];
export type SectionRubrique = Extract<Rubrique, { kind: "section" }>;
export type SectionRubriqueDefinition = RubriqueDefinition & { kind: "section" };
export type SectionId = SectionRubrique["id"];
export type FinalizedSectionId = Extract<
  SectionRubrique,
  { implementation: "finalized" }
>["id"];

export type VisibleFinalizedSectionId = Extract<
  SectionRubrique,
  { availability: "available"; implementation: "finalized" }
>["id"];

import type { RubriqueDefinition } from "./base-types";

export type {
  LocalizedText,
  RubriqueAvailability,
  RubriqueCategory,
  RubriqueDefinition,
  RubriqueImplementation,
  RubriqueKind,
  RubriqueSpaceId,
} from "./base-types";

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

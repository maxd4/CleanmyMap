import type { PageFamilyRouteException } from "@/lib/ui/page-families/types";
import { EXPLORER_ROUTE } from "@/lib/accueil-pilotage-routes";

/**
 * Exceptions explicites par route.
 *
 * Une exception doit être :
 * - nommée ;
 * - testée ;
 * - documentée dans documentation/pages_site ;
 * - préférée aux classes visuelles dupliquées localement.
 */
export const PAGE_FAMILY_ROUTE_EXCEPTIONS: PageFamilyRouteException[] = [
  {
    id: "explorer-sommaire",
    note:
      "Sommaire du bloc 01 : famille visuelle jaune dédiée, cartes locales conservées comme exception documentée.",
    match: (pathname) =>
      pathname === EXPLORER_ROUTE ||
      pathname.startsWith(`${EXPLORER_ROUTE}/`),
    familyId: "apprendre",
  },
  {
    id: "methodologie-impact",
    note:
      "Méthodologie rattachée à Cartographie & Impact ; le runtime résout actuellement la variante sky dédiée.",
    match: (pathname) =>
      pathname === "/methodologie" ||
      pathname.startsWith("/methodologie/"),
    familyId: "cartographie-impact",
  },
  {
    id: "weather-operations",
    note:
      "Météo et préparation terrain rattachées au bloc Agir.",
    match: (pathname) =>
      pathname === "/sections/weather" ||
      pathname.startsWith("/sections/weather/"),
    familyId: "agir",
  },
  {
    id: "join-group-form",
    note:
      "Formulaire de groupe rattaché au bloc Agir.",
    match: (pathname) =>
      pathname === "/sections/rejoindre-un-formulaire" ||
      pathname.startsWith("/sections/rejoindre-un-formulaire/"),
    familyId: "agir",
  },
];

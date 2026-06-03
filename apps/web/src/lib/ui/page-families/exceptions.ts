import type { PageFamilyRouteException } from "@/lib/ui/page-families/types";
import { EXPLORER_ROUTE } from "@/lib/accueil-pilotage-routes";

/**
 * Exceptions explicites par route.
 * Ajouter ici plutôt que dupliquer des classes dans chaque page.
 */
export const PAGE_FAMILY_ROUTE_EXCEPTIONS: PageFamilyRouteException[] = [
  {
    id: "explorer-sommaire",
    note: "Sommaire bloc 01 : fond yellow, cartes BLOCK_THEME inchangées dans explorer/page.tsx",
    match: (pathname) =>
      pathname === EXPLORER_ROUTE || pathname.startsWith(`${EXPLORER_ROUTE}/`),
    familyId: "apprendre",
  },
  {
    id: "methodologie-impact",
    note: "Rubrique rouge d'impact cliquable dans la famille cartographie-impact",
    match: (pathname) =>
      pathname === "/methodologie" || pathname.startsWith("/methodologie/"),
    familyId: "cartographie-impact",
  },
  {
    id: "weather-operations",
    note: "Météo et logistique rattachée au bloc Agir pour centraliser les tokens hero",
    match: (pathname) =>
      pathname === "/sections/weather" || pathname.startsWith("/sections/weather/"),
    familyId: "agir",
  },
];

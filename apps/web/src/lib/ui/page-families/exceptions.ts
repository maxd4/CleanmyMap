import type { PageFamilyRouteException } from "@/lib/ui/page-families/types";

/**
 * Exceptions explicites par route.
 * Ajouter ici plutôt que dupliquer des classes dans chaque page.
 */
export const PAGE_FAMILY_ROUTE_EXCEPTIONS: PageFamilyRouteException[] = [
  {
    id: "explorer-sommaire",
    note: "Sommaire bloc 01 : fond yellow, cartes BLOCK_THEME inchangées dans explorer/page.tsx",
    match: (pathname) =>
      pathname === "/explorer" || pathname.startsWith("/explorer/"),
    familyId: "apprendre",
  },
  {
    id: "methodologie-impact",
    note: "Rubrique rouge d'impact cliquable dans la famille cartographie-impact",
    match: (pathname) =>
      pathname === "/methodologie" || pathname.startsWith("/methodologie/"),
    familyId: "cartographie-impact",
  },
];

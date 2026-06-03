export type {
  PageFamilyCardTokens,
  PageFamilyDefinition,
  PageFamilyHeroTokens,
  PageFamilyId,
  PageFamilyRouteException,
  ResolvedPageFamily,
} from "@/lib/ui/page-families/types";

export {
  ACCUEIL_PILOTAGE_FAMILY,
  ACCUEIL_PILOTAGE_PAGE_HERO,
} from "@/lib/ui/page-families/families/registry";

export {
  EXPLORER_SOMMAIRE_FAMILY,
  METHODOLOGIE_FAMILY,
  PAGE_FAMILIES,
} from "@/lib/ui/page-families/families/registry";
export { PAGE_FAMILY_ROUTE_EXCEPTIONS } from "@/lib/ui/page-families/exceptions";

export {
  getPageFamilyById,
  resolveBasePageFamilyId,
  resolvePageFamily,
} from "@/lib/ui/page-families/resolve-page-family";

export { usePageFamily } from "@/lib/ui/page-families/use-page-family";

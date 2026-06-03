import { HOME_ROUTE } from "@/lib/home-routes";
import { DASHBOARD_ROUTE, EXPLORER_ROUTE } from "@/lib/accueil-pilotage-routes";

export type FooterVariant = "full" | "compact";

const FULL_FOOTER_PATHS = [
  HOME_ROUTE,
  EXPLORER_ROUTE,
  DASHBOARD_ROUTE,
  "/sections/feedback",
  "/contact",
  "/a-propos",
  "/about",
] as const;

const FULL_FOOTER_PREFIXES = ["/landing"] as const;

export function shouldUseFullFooter(pathname: string): boolean {
  return (
    FULL_FOOTER_PATHS.includes(pathname as (typeof FULL_FOOTER_PATHS)[number]) ||
    FULL_FOOTER_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  );
}

export function resolveFooterVariant(pathname: string): FooterVariant {
  return shouldUseFullFooter(pathname) ? "full" : "compact";
}

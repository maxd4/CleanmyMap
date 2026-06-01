import path from "node:path";
import { entries } from "../generate-canonical-pages.mjs";
import { closeCookieBanner } from "./capture-actions.mjs";

const screenRoot = path.resolve("documentation/pages_site/screen");

const DEFAULT_ACTIONS = [closeCookieBanner("pre")];

const routeOverrides = new Map([
  ["/", { actions: [closeCookieBanner("pre")] }],
  ["/explorer", { actions: [closeCookieBanner("pre")] }],
  ["/dashboard", { actions: [closeCookieBanner("pre")] }],
  ["/profil", { actions: [closeCookieBanner("pre")] }],
  ["/admin", { actions: [closeCookieBanner("pre")] }],
  ["/admin/godmode", { actions: [closeCookieBanner("pre")] }],
  ["/sign-in", { actions: [closeCookieBanner("pre")] }],
  ["/sign-up", { actions: [closeCookieBanner("pre")] }],
  ["/onboarding", { actions: [closeCookieBanner("pre")] }],
  ["/onboarding/localisation", { actions: [closeCookieBanner("pre")] }],
]);

export const screenCaptureRoutes = entries.map((entry) => {
  const override = routeOverrides.get(entry.route);

  return {
    id: `${entry.family}:${entry.slug}`,
    route: entry.route,
    slug: entry.slug,
    family: entry.family,
    title: entry.title,
    kind: entry.kind,
    status: entry.status,
    actions: override?.actions ?? DEFAULT_ACTIONS,
    outputPath: path.join(screenRoot, entry.family, entry.slug, "desktop.png"),
  };
});

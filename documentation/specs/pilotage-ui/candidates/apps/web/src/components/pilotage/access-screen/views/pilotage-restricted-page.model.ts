import { ADMIN_ROUTE, DASHBOARD_ROUTE, REPORTS_ROUTE, buildProfileRoute } from "@/lib/accueil-pilotage-routes";
import type { EffectiveAccess } from "@/lib/domain-language";
import { getProfileActions, isAdminLikeProfile, type AppProfile, type ProfileAction } from "@/lib/profiles";

type RestrictedSection = { id: "supervision" | "analysis" | "profile"; actions: ProfileAction[] };
const COMMON_ACTIONS: ProfileAction[] = [
  { href: REPORTS_ROUTE, label: { fr: "Rapports d'impact", en: "Impact reports" }, description: { fr: "Indicateurs, comparaisons et exports disponibles.", en: "Available metrics, comparisons and exports." } },
  { href: "/actions/map", label: { fr: "Carte des actions", en: "Action map" }, description: { fr: "Explorer les actions et leur répartition géographique.", en: "Explore actions and their geographic distribution." } },
  { href: "/methodologie", label: { fr: "Méthodologie", en: "Methods" }, description: { fr: "Vérifier les calculs et leurs limites.", en: "Review calculations and limitations." } },
];

export function buildRestrictedPilotageSections(profile: AppProfile, access: EffectiveAccess | null): RestrictedSection[] {
  const sections: RestrictedSection[] = [];
  if (access?.canAccessAdminPage && isAdminLikeProfile(profile)) {
    sections.push({ id: "supervision", actions: [
      { href: ADMIN_ROUTE, label: { fr: "Cockpit opérationnel", en: "Operations cockpit" }, description: { fr: "Traiter les dossiers, les demandes et consulter le journal.", en: "Review cases, requests and the audit journal." } },
      { href: "/admin/services", label: { fr: "Services et santé", en: "Services and health" }, description: { fr: "Consulter les intégrations, les quotas et les signaux de supervision.", en: "Review integrations, quotas and monitoring signals." } },
    ] });
  }
  const institutionalActions: ProfileAction[] = access && (profile === "elu" || profile === "max")
    ? [
      { href: "/sections/elus", label: { fr: "Gouvernance", en: "Governance" }, description: { fr: "Synthèse des actions publiques et priorités.", en: "Published action summary and priorities." } },
      { href: "/sponsor-portal", label: { fr: "Portail décideur", en: "Decision portal" }, description: { fr: "Impact consolidé et méthodes de calcul.", en: "Consolidated impact and calculation methods." } },
    ]
    : [];
  const used = new Set([...COMMON_ACTIONS.map(action => action.href), ...institutionalActions.map(action => action.href), DASHBOARD_ROUTE, "/pilotage", buildProfileRoute(profile)]);
  const contextualActions = access && !isAdminLikeProfile(profile)
    ? getProfileActions(profile).filter(action => {
        if (used.has(action.href) || action.href.startsWith("/admin")) return false;
        used.add(action.href);
        return true;
      })
    : [];
  sections.push({ id: "analysis", actions: [...institutionalActions, ...COMMON_ACTIONS, ...contextualActions] });
  sections.push({ id: "profile", actions: [
    { href: DASHBOARD_ROUTE, label: { fr: "Mon espace", en: "Dashboard" }, description: { fr: "Vos notifications, raccourcis et compte.", en: "Your notifications, shortcuts and account." } },
    { href: buildProfileRoute(profile), label: { fr: "Changer de rôle actif", en: "Switch active role" }, description: { fr: "Ouvrir le profil puis Compte et rôles.", en: "Open the profile, then Account and roles." } },
  ] });
  return sections;
}

import { DASHBOARD_ROUTE } from "@/lib/accueil-pilotage-routes";
import { getProfileActions, type AppProfile, type ProfileAction } from "@/lib/profiles";
import { dashboardTabHref } from "./tabs";

export function getDashboardRoleActions(profile: AppProfile): ProfileAction[] {
  return getProfileActions(profile).map((action) => {
    if (action.href !== DASHBOARD_ROUTE) return action;
    if (profile === "coordinateur") return {
      href: dashboardTabHref("notifications"),
      label: { fr: "Demandes et invitations", en: "Requests and invitations" },
      description: { fr: "Consulter les demandes et décisions disponibles.", en: "Review available requests and decisions." },
    };
    return {
      href: dashboardTabHref("collective"),
      label: { fr: "Indicateurs collectifs", en: "Collective metrics" },
      description: { fr: "Consulter l'activité publiée et la qualité des données.", en: "Review published activity and data quality." },
    };
  });
}

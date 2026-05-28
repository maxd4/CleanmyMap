import {
  BarChart3,
  Compass,
  FileText,
  LockKeyhole,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { NavigationGridItem } from "@/components/ui/navigation-grid";
import type { AppProfile } from "@/lib/profiles";
import {
  ADMIN_GODMODE_ROUTE,
  ADMIN_ROUTE,
  DASHBOARD_ROUTE,
  OBSERVATOIRE_ROUTE,
  REPORTS_ROUTE,
  SPONSOR_PORTAL_ROUTE,
} from "@/lib/accueil-pilotage-routes";

export type PilotageLocale = "fr" | "en";

export const PAGE_COPY: Record<
  PilotageLocale,
  {
    title: string;
    description: string;
    summaryEyebrow: string;
    windowsEyebrow: string;
    methodsEyebrow: string;
    prioritiesEyebrow: string;
    accessEyebrow: string;
    overviewLabel: string;
    decisionLabel: string;
    executionLabel: string;
    lockedTitle: string;
    lockedDescription: string;
    restrictedTitle: string;
    restrictedDescription: string;
    connectLabel: string;
  }
> = {
  fr: {
    title: "Pilotage transverse",
    description:
      "Observation, décision, exécution. Une vue transverse pour coordonner, arbitrer et suivre les effets sans mélanger les permissions ni le niveau de criticité.",
    summaryEyebrow: "Résumé décisionnel",
    windowsEyebrow: "Fenêtres d'analyse",
    methodsEyebrow: "Méthode et fiabilité",
    prioritiesEyebrow: "Priorités opérationnelles",
    accessEyebrow: "Accès sensibles",
    overviewLabel: "Observation",
    decisionLabel: "Décision",
    executionLabel: "Exécution",
    lockedTitle: "Connexion requise",
    lockedDescription:
      "Ouvrez une session autorisée pour accéder à l'espace Accueil & Pilotage. Cette vue sert aux profils de coordination, d'administration et d'arbitrage final.",
    restrictedTitle: "Accès réservé",
    restrictedDescription:
      "Votre compte est connecté, mais il ne dispose pas des droits de supervision transverse nécessaires pour cet espace.",
    connectLabel: "Se connecter",
  },
  en: {
    title: "Transverse cockpit",
    description:
      "Observation, decision, execution. A transverse view to coordinate, arbitrate and track outcomes without mixing permissions or criticality levels.",
    summaryEyebrow: "Decision summary",
    windowsEyebrow: "Analysis windows",
    methodsEyebrow: "Method and reliability",
    prioritiesEyebrow: "Operational priorities",
    accessEyebrow: "Sensitive access",
    overviewLabel: "Observation",
    decisionLabel: "Decision",
    executionLabel: "Execution",
    lockedTitle: "Login required",
    lockedDescription:
      "Open an authorized session to access the Home & Operations area. This view is reserved for coordination, administration and final arbitration profiles.",
    restrictedTitle: "Access restricted",
    restrictedDescription:
      "Your account is connected, but it does not yet have the transverse supervision rights needed for this area.",
    connectLabel: "Sign in",
  },
};

export function buildAccessLinks(profile: AppProfile, locale: PilotageLocale): NavigationGridItem[] {
  const baseItems: NavigationGridItem[] = [
    {
      icon: BarChart3,
      title: locale === "fr" ? "Mon espace" : "Dashboard",
      desc:
        locale === "fr"
          ? "KPI, synthèse 30 jours et priorités de la journée."
          : "KPIs, 30-day summary and the day's priorities.",
      iconBg: "bg-white/10",
      iconColor: "text-amber-100",
      accent: "from-[#2C1C0F] to-[#4C3118]",
      ring: "ring-amber-200/30",
      dot: "bg-amber-300",
      href: DASHBOARD_ROUTE,
    },
    {
      icon: FileText,
      title: locale === "fr" ? "Rapports" : "Reports",
      desc:
        locale === "fr"
          ? "Ventilation des fenêtres, exports et preuves lisibles."
          : "Window breakdown, exports and readable evidence.",
      iconBg: "bg-white/10",
      iconColor: "text-orange-100",
      accent: "from-[#302115] to-[#52351C]",
      ring: "ring-orange-200/30",
      dot: "bg-orange-300",
      href: REPORTS_ROUTE,
    },
    {
      icon: Compass,
      title: locale === "fr" ? "Observatoire" : "Observatory",
      desc:
        locale === "fr"
          ? "Lecture large des tendances, avant la prise de décision."
          : "Wide trend reading before making decisions.",
      iconBg: "bg-white/10",
      iconColor: "text-yellow-100",
      accent: "from-[#2A1B10] to-[#4A3119]",
      ring: "ring-yellow-200/30",
      dot: "bg-yellow-300",
      href: OBSERVATOIRE_ROUTE,
    },
  ];

  const adminItems: NavigationGridItem[] = [
    {
      icon: Settings,
      title: locale === "fr" ? "Administration" : "Administration",
      desc:
        locale === "fr"
          ? "File d'attente, validations et supervision des services."
          : "Queue, validations and service supervision.",
      iconBg: "bg-white/10",
      iconColor: "text-amber-100",
      accent: "from-[#2E1E12] to-[#4E341D]",
      ring: "ring-amber-200/30",
      dot: "bg-amber-300",
      href: ADMIN_ROUTE,
    },
    {
      icon: ShieldCheck,
      title: locale === "fr" ? "Portail décideur" : "Decision portal",
      desc:
        locale === "fr"
          ? "Vue sponsor et lecture institutionnelle du ROI."
          : "Sponsor view and institutional ROI reading.",
      iconBg: "bg-white/10",
      iconColor: "text-orange-100",
      accent: "from-[#342216] to-[#5A3920]",
      ring: "ring-orange-200/30",
      dot: "bg-orange-300",
      href: SPONSOR_PORTAL_ROUTE,
    },
  ];

  if (profile === "max") {
    adminItems.push({
      icon: LockKeyhole,
      title: locale === "fr" ? "God Mode" : "God Mode",
      desc:
        locale === "fr"
          ? "Accès total avec confirmation obligatoire."
          : "Full access with mandatory confirmation.",
      iconBg: "bg-white/10",
      iconColor: "text-amber-100",
      accent: "from-[#3A2516] to-[#6B4524]",
      ring: "ring-amber-100/30",
      dot: "bg-amber-200",
      href: ADMIN_GODMODE_ROUTE,
    });
  }

  return [...baseItems, ...adminItems];
}

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Landmark,
  ShieldCheck,
  Users,
} from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { SPONSOR_PORTAL_ROUTE } from "@/lib/accueil-pilotage-routes";
import { localize } from "./partners-network-section.model";

const PARTNER_TYPES = [
  {
    icon: Users,
    title: { fr: "Associations", en: "Associations" },
    description: {
      fr: "Agissent sur le terrain et mobilisent les citoyens.",
      en: "Act on the ground and mobilize citizens.",
    },
  },
  {
    icon: Landmark,
    title: { fr: "Collectivités", en: "Collectivities" },
    description: {
      fr: "Pilotent des territoires et facilitent les actions locales.",
      en: "Steer territories and support local actions.",
    },
  },
  {
    icon: Building2,
    title: { fr: "Entreprises", en: "Companies" },
    description: {
      fr: "Apportent des ressources, des outils et leur expertise.",
      en: "Bring resources, tools and expertise.",
    },
  },
  {
    icon: ShieldCheck,
    title: { fr: "Institutions", en: "Institutions" },
    description: {
      fr: "Fournissent des données, des cadres et des références.",
      en: "Provide data, frameworks and references.",
    },
  },
] as const;

const WHY_PARTNER = [
  {
    fr: "Valoriser vos actions et votre impact",
    en: "Showcase your actions and impact",
  },
  {
    fr: "Accéder à des données et outils fiables",
    en: "Access reliable data and tools",
  },
  {
    fr: "Collaborer sur des projets concrets",
    en: "Collaborate on concrete projects",
  },
  {
    fr: "Renforcer la transparence et la crédibilité",
    en: "Strengthen transparency and credibility",
  },
  {
    fr: "Rejoindre un réseau engagé et utile",
    en: "Join an engaged, useful network",
  },
] as const;

export function PartnersNetworkAside({ fr }: { fr: boolean }) {
  const locale = fr ? "fr" : "en";

  return (
    <div className="space-y-6">
      <aside className="rounded-3xl border border-pink-100 bg-pink-50/70 p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-black text-slate-950">
          {fr ? "Types de partenaires" : "Partner types"}
        </h2>
        <div className="mt-6 space-y-4">
          {PARTNER_TYPES.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title.fr} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-pink-200 bg-white text-pink-700">
                  <Icon size={18} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-950">{localize(locale, item.title)}</p>
                  <p className="cmm-text-small leading-relaxed text-slate-800">
                    {localize(locale, item.description)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      <aside className="rounded-3xl border border-pink-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-black text-slate-950">
          {fr ? "Pourquoi devenir partenaire ?" : "Why become a partner?"}
        </h2>

        <div className="mt-5 space-y-3">
          {WHY_PARTNER.map((item) => (
            <div key={item.fr} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-700">
                <CheckCircle2 size={14} />
              </div>
              <p className="text-base leading-relaxed text-slate-800">
                {localize(locale, item)}
              </p>
            </div>
          ))}
        </div>

        <CmmButton
          href="/partners/onboarding"
          tone="primary"
          variant="pill"
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-pink-600 px-5 cmm-text-small font-semibold text-white shadow-sm"
        >
          {fr ? "Devenir partenaire" : "Become a partner"}
          <ArrowRight size={16} />
        </CmmButton>

            <div className="mt-4 space-y-1 cmm-text-small leading-relaxed text-slate-600">
          <p>
            {fr
              ? "En savoir plus sur notre programme partenaire."
              : "Learn more about our partner program."}
          </p>
          <Link
            href={SPONSOR_PORTAL_ROUTE}
            className="inline-flex items-center gap-2 cmm-text-small font-semibold text-pink-800 hover:text-pink-900"
          >
            {fr ? "Découvrir le programme" : "Discover the program"}
            <ArrowRight size={14} />
          </Link>
        </div>
      </aside>
    </div>
  );
}

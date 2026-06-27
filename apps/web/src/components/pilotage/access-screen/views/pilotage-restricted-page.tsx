import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { PAGE_COPY, buildAccessLinks } from "../access-screen-constants";
import type { PilotageLocale } from "../access-screen-constants";
import type { AppProfile } from "@/lib/profiles";
import { getProfileLabel, getProfileSubtitle } from "@/lib/profiles";
import { NavigationGrid } from "@/components/ui/navigation-grid";
import { PageHero, PageHeroBadge } from "@/components/ui/page-hero";
import { getPageFamilyById } from "@/lib/ui/page-families";
import {
  DASHBOARD_ROUTE,
  REPORTS_ROUTE,
} from "@/lib/accueil-pilotage-routes";

export function PilotageRestrictedPage({
  locale,
  profile,
}: {
  locale: PilotageLocale;
  profile: AppProfile;
}) {
  const copy = PAGE_COPY[locale];
  const profileLabel = getProfileLabel(profile, locale);
  const profileSubtitle = getProfileSubtitle(profile, locale);
  const links = buildAccessLinks(profile, locale).slice(0, 3);
  const pageFamily = getPageFamilyById("accueil-pilotage");

  return (
    <section className="w-full space-y-6 p-4 md:p-8">
      <div className="space-y-8 md:p-2">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <PageHero
            family={pageFamily}
            title={copy.title}
            subtitle={copy.description}
            badges={
              <>
                <PageHeroBadge family={pageFamily}>
                  <Sparkles size={14} aria-hidden="true" />
                  {locale === "fr" ? "Accueil & Pilotage" : "Home & Operations"}
                </PageHeroBadge>
                <PageHeroBadge family={pageFamily} muted>
                  {profileLabel}
                </PageHeroBadge>
                <PageHeroBadge family={pageFamily} muted>
                  {profileSubtitle}
                </PageHeroBadge>
              </>
            }
          />

          <aside className="rounded-[1.75rem] border border-white/12 bg-[rgba(69,45,28,0.82)] p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-100/70">
              {locale === "fr" ? "Accès actuel" : "Current access"}
            </p>
            <div className="mt-3 grid gap-3">
              <div className="rounded-2xl border border-white/12 bg-black/10 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-100/70">
                  {locale === "fr" ? "Profil" : "Profile"}
                </p>
                <p className="mt-2 text-lg font-bold text-white">{profileLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-black/10 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-100/70">
                  {locale === "fr" ? "Lecture autorisée" : "Allowed reading"}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/82">
                  {locale === "fr"
                    ? "Le cockpit complet reste réservé aux profils Coordination, IMU et arbitrage final."
                    : "The full cockpit remains reserved for Coordination, IMU and final arbitration profiles."}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <NavigationGrid columns={{ default: 1, sm: 2, md: 3, xl: 3 }} items={links} />

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
            {copy.accessEyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight cmm-text-primary">
            {locale === "fr" ? "Ce que vous pouvez consulter maintenant" : "What you can consult now"}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              {
                title: locale === "fr" ? "Observation" : "Observation",
                text:
                  locale === "fr"
                    ? "Vue d'ensemble des indicateurs et du contexte."
                    : "Overview of indicators and context.",
              },
              {
                title: locale === "fr" ? "Décision" : "Decision",
                text:
                  locale === "fr"
                    ? "Synthèses et arbitrages lisibles."
                    : "Readable summaries and arbitration.",
              },
              {
                title: locale === "fr" ? "Exécution" : "Execution",
                text:
                  locale === "fr"
                    ? "Accès aux espaces qui restent publics dans la navigation."
                    : "Access to spaces that remain public in navigation.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">
                  {item.title}
                </p>
                <p className="mt-2 text-sm cmm-text-secondary">{item.text}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
            {locale === "fr" ? "Passerelles" : "Shortcuts"}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight cmm-text-primary">
            {locale === "fr" ? "Outils utiles sans élargir l'accès" : "Useful tools without broadening access"}
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={DASHBOARD_ROUTE}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-black text-white transition hover:-translate-y-[1px] hover:bg-slate-800"
            >
              {locale === "fr" ? "Dashboard" : "Dashboard"}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href={REPORTS_ROUTE}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-black cmm-text-primary transition hover:-translate-y-[1px] hover:border-amber-300"
            >
              {locale === "fr" ? "Rapports" : "Reports"}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
              <Link
                href="/actions/map"
                prefetch={false}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-black cmm-text-primary transition hover:-translate-y-[1px] hover:border-amber-300"
              >
              {locale === "fr" ? "Carte des actions" : "Action map"}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </article>
      </section>
    </section>
  );
}

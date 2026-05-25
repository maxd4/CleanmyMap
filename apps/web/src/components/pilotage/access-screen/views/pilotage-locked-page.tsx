import { ArrowRight, BarChart3, Compass, LockKeyhole, ShieldAlert, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { PAGE_COPY } from "../access-screen-constants";
import { PageHero, PageHeroBadge } from "@/components/ui/page-hero";
import { getPageFamilyById } from "@/lib/ui/page-families";
import type { PilotageLocale } from "../access-screen-constants";

export function PilotageLockedPage({
  locale,
  isAuthenticated,
}: {
  locale: PilotageLocale;
  isAuthenticated: boolean;
}) {
  const copy = PAGE_COPY[locale];
  const pageFamily = getPageFamilyById("accueil-pilotage");
  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8 md:py-10">
      <div className="space-y-8 md:p-2">
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-5">
            <PageHero
              family={pageFamily}
              titleSize="compact"
              title={isAuthenticated ? copy.restrictedTitle : copy.lockedTitle}
              subtitle={
                isAuthenticated ? copy.restrictedDescription : copy.lockedDescription
              }
              badges={
                <>
                  <PageHeroBadge family={pageFamily}>
                    <Sparkles size={14} aria-hidden="true" />
                    {locale === "fr" ? "Accueil & Pilotage" : "Home & Operations"}
                  </PageHeroBadge>
                  <PageHeroBadge family={pageFamily} muted>
                    {locale === "fr" ? "Contrôle opérationnel" : "Operational control"}
                  </PageHeroBadge>
                </>
              }
            />

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: copy.overviewLabel,
                  value: locale === "fr" ? "Observation" : "Observation",
                  detail:
                    locale === "fr"
                      ? "KPI, contexte, lecture rapide."
                      : "KPIs, context and fast reading.",
                },
                {
                  label: copy.decisionLabel,
                  value: locale === "fr" ? "Décision" : "Decision",
                  detail:
                    locale === "fr"
                      ? "Arbitrage, priorités, alertes."
                      : "Arbitration, priorities, alerts.",
                },
                {
                  label: copy.executionLabel,
                  value: locale === "fr" ? "Exécution" : "Execution",
                  detail:
                    locale === "fr"
                      ? "Actions sensibles et suivi."
                      : "Sensitive actions and follow-up.",
                },
              ].map((item) => (
                <article
                  key={item.label}
                  className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm"
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-100/70">
                    {item.label}
                  </p>
                  <p className="mt-2 text-lg font-bold text-white">{item.value}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/72">{item.detail}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-[1.75rem] border border-white/12 bg-[rgba(69,45,28,0.82)] p-5 shadow-[0_18px_40px_-28px_rgba(69,45,28,0.26)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-100/70">
                  {locale === "fr" ? "Permissions" : "Permissions"}
                </p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-white">
                  {locale === "fr" ? "Accès visible, contenu réservé" : "Visible access, reserved content"}
                </h2>
              </div>
              {isAuthenticated ? (
                <ShieldAlert className="h-8 w-8 text-orange-100" aria-hidden="true" />
              ) : (
                <LockKeyhole className="h-8 w-8 text-orange-100" aria-hidden="true" />
              )}
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-white/12 bg-black/10 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-100/70">
                  {locale === "fr" ? "Ce bloc sert à" : "This block is for"}
                </p>
                <p className="mt-2 text-sm font-semibold text-white/92">
                  {locale === "fr"
                    ? "La supervision transverse, les arbitrages et les accès sensibles."
                    : "Transverse supervision, arbitration and sensitive access."}
                </p>
              </div>

              <div className="rounded-2xl border border-white/12 bg-black/10 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-100/70">
                  {locale === "fr" ? "Profil détecté" : "Detected profile"}
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {locale === "fr" ? "Connexion" : "Connection"} {isAuthenticated ? "active" : "requise"}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {!isAuthenticated ? (
                <Link
                  href="/sign-in?redirect_url=/pilotage"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-black text-slate-900 transition hover:-translate-y-[1px] hover:bg-orange-50"
                >
                  {copy.connectLabel}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ) : null}
              <Link
                href="/dashboard"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2.5 text-sm font-black text-white transition hover:-translate-y-[1px] hover:bg-white/14"
              >
                <BarChart3 size={16} aria-hidden="true" />
                {locale === "fr" ? "Tableau de bord" : "Dashboard"}
              </Link>
              <Link
                href="/observatoire"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2.5 text-sm font-black text-white transition hover:-translate-y-[1px] hover:bg-white/14"
              >
                <Compass size={16} aria-hidden="true" />
                {locale === "fr" ? "Observatoire" : "Observatory"}
              </Link>
            </div>
          </aside>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          {
            title: locale === "fr" ? "Observation" : "Observation",
            detail:
              locale === "fr"
                ? "Vue synthèse des KPIs, de la fiabilité et des fenêtres."
                : "Summary view of KPIs, reliability and windows.",
            icon: BarChart3,
          },
          {
            title: locale === "fr" ? "Décision" : "Decision",
            detail:
              locale === "fr"
                ? "Validation des alertes, arbitrage et priorisation."
                : "Alerts, arbitration and prioritization.",
            icon: ShieldCheck,
          },
          {
            title: locale === "fr" ? "Exécution" : "Execution",
            detail:
              locale === "fr"
                ? "Accès aux espaces sensibles et confirmations."
                : "Sensitive spaces and confirmations.",
            icon: TriangleAlert,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.title}
              className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm cmm-text-secondary">{item.detail}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

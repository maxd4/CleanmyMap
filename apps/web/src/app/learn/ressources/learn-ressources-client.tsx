"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { LearnRubricShell } from "@/components/learn/learn-rubric-shell";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { useTranslation } from "@/lib/i18n/use-translation";
import { LEARN_RESOURCE_EVENTS } from "@/lib/learning/learn-rubric-data";
import { recordLearnPageVisit } from "@/lib/learning/learn-progress";

const locales = { fr, en: enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export function LearnRessourcesClient() {
  const { locale } = useSitePreferences();
  const { t } = useTranslation("learnHub");
  const isFrench = locale === "fr";
  const sortingCues = [
    {
      fr: {
        title: "Mégots",
        text: "À part, dans un contenant fermé et au sec.",
      },
      en: {
        title: "Butts",
        text: "Keep separate, sealed, and dry.",
      },
    },
    {
      fr: {
        title: "Verre / métal",
        text: "Sacs distincts pour éviter la contamination croisée.",
      },
      en: {
        title: "Glass / metal",
        text: "Use separate bags to avoid cross-contamination.",
      },
    },
    {
      fr: {
        title: "Plastique",
        text: "Regrouper les matières séparables, sans mélanger le mixte.",
      },
      en: {
        title: "Plastic",
        text: "Group separable materials and keep mixed waste apart.",
      },
    },
    {
      fr: {
        title: "Mixte",
        text: "Isoler le non triable et noter la raison terrain.",
      },
      en: {
        title: "Mixed",
        text: "Isolate non-sortable waste and note why on site.",
      },
    },
  ] as const;

  const sortingMistakes = isFrench
    ? [
        "Ne pas mélanger mégots et déchets recyclables.",
        "Ne pas humidifier le contenu avant le tri.",
      ]
    : [
        "Do not mix butts with recyclable waste.",
        "Do not wet the contents before sorting.",
      ];

  useEffect(() => {
    recordLearnPageVisit("ressources");
  }, []);

  return (
    <LearnRubricShell
      title={{ fr: "Ressources", en: "Resources" }}
      subtitle={{
        fr: "Retrouver le kit, les repères et les rendez-vous utiles",
        en: "Find the kit, references and useful events",
      }}
      description={{
        fr: "Cette page rassemble les ressources de terrain, les prochains événements et les repères utiles à reprendre vite.",
        en: "This page gathers field resources, upcoming events and useful references to revisit quickly.",
      }}
      backHref="/learn/hub"
      backLabel={{ fr: "Retour au hub", en: "Back to hub" }}
      accent="orange"
      highlights={[
        { fr: "Kit terrain", en: "Field kit" },
        { fr: "Événements", en: "Events" },
        { fr: "Repères utiles", en: "Useful references" },
      ]}
      cta={{
        href: "/learn/comprendre",
        label: { fr: "Voir le contexte", en: "See the context" },
      }}
    >
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="h-[620px] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                {isFrench ? "Événements et repères utiles" : "Events and useful references"}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight cmm-text-primary">
                {isFrench ? "Calendrier simple à relire" : "Simple calendar to review"}
              </h2>
            </div>
          </div>
          <div className="mt-5 h-[540px]">
            <Calendar
              localizer={localizer}
              events={LEARN_RESOURCE_EVENTS}
              startAccessor="start"
              endAccessor="end"
              style={{ height: "100%" }}
              culture={locale}
              messages={{
                next: t("events.next"),
                previous: t("events.previous"),
                today: t("events.today"),
                month: t("events.month"),
                week: t("events.week"),
                day: t("events.day"),
              }}
            />
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              {isFrench ? "Kit terrain" : "Field kit"}
            </p>
            <div className="mt-4 grid gap-3">
              {[t("kit.doc1_title"), t("kit.doc2_title"), t("kit.doc3_title"), t("kit.doc4_title")].map(
                (item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold cmm-text-primary"
                  >
                    {item}
                  </div>
                ),
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              {isFrench ? "Repères de tri" : "Sorting cues"}
            </p>
            <div className="mt-4 space-y-4">
              <p className="text-sm cmm-text-secondary">
                {isFrench
                  ? "Les repères ci-dessous servent de mémo rapide avant ou après une sortie. Tu peux y chercher un cas concret: poubelle, déchèterie, point de collecte ou signalement public."
                  : "Use the cues below as a quick reminder before or after an outing. You can look up a concrete case: bin, recycling center, dedicated drop-off point or public report."}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {sortingCues.map((cue) => (
                  <div
                    key={cue.fr.title}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      {isFrench ? cue.fr.title : cue.en.title}
                    </p>
                    <p className="mt-2 text-sm font-medium cmm-text-primary">
                      {isFrench ? cue.fr.text : cue.en.text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
                  {isFrench ? "Erreurs fréquentes" : "Common mistakes"}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm cmm-text-secondary">
                  {sortingMistakes.map((mistake) => (
                    <li key={mistake}>{mistake}</li>
                  ))}
                </ul>
              </div>

              <Link
                href="/sections/recycling"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                {isFrench ? "Ouvrir l'assistant tri" : "Open the sorting assistant"}
              </Link>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                  {isFrench ? "Guide compost" : "Compost guide"}
                </p>
                <p className="mt-2 text-sm cmm-text-secondary">
                  {isFrench
                    ? "Composter à la maison, rejoindre un site local et voir une mini-carte des points autour de Paris."
                    : "Compost at home, join a local site and see a small map of points around Paris."}
                </p>
                <Link
                  href="/sections/compost"
                  className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  {isFrench ? "Ouvrir le guide compost" : "Open the compost guide"}
                </Link>
              </div>
            </div>
          </article>
        </aside>
      </section>
    </LearnRubricShell>
  );
}

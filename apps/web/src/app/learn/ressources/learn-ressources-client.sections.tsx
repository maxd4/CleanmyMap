"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronDown, CloudOff, Clock3, Inbox, Palette } from "lucide-react";
import { format, type Locale } from "date-fns";
import { enUS, fr } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { LEARN_RESOURCE_EVENTS } from "@/lib/learning/learn-rubric-data";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";

import {
  ARTWORK_REFERENCES,
  BROWSER_HISTORY_CLEANUP_STEPS,
  DIGITAL_MAINTENANCE_TOPICS,
  MAILBOX_CLEANUP_STEPS,
  RESOURCE_SHORTCUTS,
  RESOURCE_SPOTLIGHTS,
  RESOURCE_TONE_CLASSES,
  RESOURCE_SORTING_CUES,
  RESOURCE_SORTING_TONE_CLASSES,
  type ResourceSpotlight,
} from "./learn-ressources-client.data";
import { useDisclosureState } from "./learn-ressources-client.state";
const DeferredLearnRessourcesCalendar = dynamic(
  () => import("./learn-ressources-calendar").then((module) => module.LearnRessourcesCalendar),
  {
    ssr: false,
    loading: () => <div className="h-[420px] rounded-[1.6rem] border border-slate-200 bg-slate-50/80" aria-hidden="true" />,
  },
);

function ResourceSpotlightCard({
  locale,
  spotlight,
  index,
}: {
  locale: LearnLocale;
  spotlight: ResourceSpotlight;
  index: number;
}) {
  const Icon = spotlight.icon;
  const tone = RESOURCE_TONE_CLASSES[spotlight.tone];

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[1.85rem] border bg-white p-4 shadow-sm transition duration-150 ease-out hover:-translate-y-1 hover:shadow-md",
        tone.border,
      )}
    >
      <div className={cn("absolute inset-0 -z-10 bg-gradient-to-br", tone.glow)} aria-hidden="true" />

      <div className="flex items-start justify-between gap-3">
        <div className={cn("inline-flex h-11 w-11 items-center justify-center rounded-2xl border", tone.badge)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
          {String(index).padStart(2, "0")}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <h3 className="text-xl font-black tracking-tight text-slate-900">{spotlight.title[locale]}</h3>
        <p className="text-sm leading-relaxed text-slate-600">{spotlight.lead[locale]}</p>
      </div>

      <div className="mt-4 space-y-2">
        {spotlight.items.map((item) => (
          <div
            key={`${spotlight.key}-${item[locale]}`}
            className={cn(
              "flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.14em]",
              tone.chip,
            )}
          >
            <span className="min-w-0 text-left">{item[locale]}</span>
            <span className={cn("h-2 w-2 shrink-0 rounded-full", tone.dot)} />
          </div>
        ))}
      </div>

      {spotlight.action ? (
        <Link
          href={spotlight.action.href}
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-900 transition hover:-translate-y-[1px] hover:bg-slate-50"
        >
          {spotlight.action.label[locale]}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
    </article>
  );
}

function EventRow({
  locale,
  title,
  start,
  end,
}: {
  locale: LearnLocale;
  title: string;
  start: Date;
  end: Date;
}) {
  const resolvedLocale: Locale = locale === "fr" ? fr : enUS;
  const dayLabel = format(start, "EEE d MMM", { locale: resolvedLocale });
  const timeLabel = `${format(start, "HH:mm", { locale: resolvedLocale })} - ${format(
    end,
    "HH:mm",
    { locale: resolvedLocale },
  )}`;

  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">{dayLabel}</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{title}</p>
        </div>
        <span className="rounded-full border border-white/80 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 shadow-sm">
          {timeLabel}
        </span>
      </div>
    </div>
  );
}

export function LearnArtworkAccordion({
  locale,
  defaultOpen = false,
}: {
  locale: LearnLocale;
  defaultOpen?: boolean;
}) {
  const { isOpen, handleToggle } = useDisclosureState(defaultOpen);

  return (
    <details
      className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6"
      open={isOpen}
      onToggle={handleToggle}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-start justify-between gap-4 rounded-[1.35rem] px-3 py-2 outline-none transition hover:bg-slate-50/70 focus-visible:bg-slate-50/80 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/70 md:min-h-14">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {locale === "fr" ? "Culture visuelle" : "Visual culture"}
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr" ? "Références artistiques à ouvrir si besoin" : "Art references to open when needed"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
            {locale === "fr"
              ? "Les fiches restent fermées au départ pour alléger le chargement. Ouvre la section pour voir une référence à la fois."
              : "The fiches stay closed at first to lighten loading. Open the section to view one reference at a time."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {ARTWORK_REFERENCES.length}
          </span>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
            <Palette className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
      </summary>

      <div className="mt-5">
        {isOpen ? (
          <div className="space-y-4">
            {ARTWORK_REFERENCES.map((artwork, index) => (
              <details
                key={artwork.key}
                className="group overflow-hidden rounded-[1.6rem] border border-slate-200 bg-slate-50 shadow-sm"
              >
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 outline-none transition hover:bg-slate-100/70 focus-visible:bg-slate-100/80 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/70 md:min-h-14 md:px-5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h4 className="mt-1 text-lg font-black tracking-tight text-slate-900 md:text-xl">
                      {artwork.title[locale]}
                    </h4>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">
                      {artwork.artist[locale]} · {artwork.material[locale]}
                    </p>
                  </div>
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition duration-150 group-open:rotate-180">
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </span>
                </summary>

                <div className="border-t border-slate-200 px-4 pb-4 pt-4 md:px-5 md:pb-5">
                  <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                    <figure className="relative h-64 overflow-hidden rounded-[1.4rem] border border-slate-200 bg-slate-50 md:h-[22rem]">
                      <Image
                        src={artwork.image.src}
                        alt={artwork.image.alt[locale]}
                        fill
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        unoptimized
                        className="object-cover"
                      />
                      <figcaption className="border-t border-slate-200 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                        {artwork.image.caption[locale]}{" "}
                        <a
                          href={artwork.source.href}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-amber-700 transition hover:text-amber-800 hover:underline"
                        >
                          {artwork.source.label[locale]}
                        </a>
                      </figcaption>
                    </figure>

                    <div className="space-y-3">
                      {artwork.context.map((paragraph) => (
                        <p key={paragraph[locale]} className="text-sm leading-relaxed text-slate-700">
                          {paragraph[locale]}
                        </p>
                      ))}

                      <div className="rounded-[1.35rem] border border-slate-200 bg-white p-3.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                          {locale === "fr" ? "Intérêt pour CleanMyMap" : "Why it matters for CleanMyMap"}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-700">{artwork.interest[locale]}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
            {locale === "fr"
              ? "Les fiches restent fermées au départ pour alléger le chargement. Ouvre la section pour voir une référence à la fois."
              : "The fiches stay closed at first to lighten loading. Open the section to view one reference at a time."}
          </p>
        )}
      </div>
    </details>
  );
}

export function LearnResourceShortcutsSection({ locale }: { locale: LearnLocale }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {locale === "fr" ? "Raccourcis utiles" : "Useful shortcuts"}
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr" ? "Les liens directs vers les rubriques utiles" : "Direct links to the useful rubrics"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
            {locale === "fr"
              ? "Les liens restent groupés au même endroit pour ouvrir vite l'assistant tri, le guide compost ou le contexte."
              : "The links stay grouped in one place so you can open the sorting assistant, compost guide or context quickly."}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {RESOURCE_SHORTCUTS.map((shortcut) => (
          <article
            key={shortcut.href}
            className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 shadow-sm transition focus-within:ring-2 focus-within:ring-amber-300/40"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">{shortcut.eyebrow[locale]}</p>
            <h4 className="mt-1 text-lg font-black tracking-tight text-slate-900">{shortcut.title[locale]}</h4>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{shortcut.detail[locale]}</p>
            <Link
              href={shortcut.href}
              className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-900 transition hover:-translate-y-[1px] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70"
            >
              {shortcut.label[locale]}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function LearnMailboxCleanupSection({ locale }: { locale: LearnLocale }) {
  return (
    <section id="boite-mail" className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {locale === "fr" ? "Sobriété numérique" : "Digital sobriety"}
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr" ? "Nettoyer sa boîte mail et ses abonnements" : "Clean your mailbox and subscriptions"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
            {locale === "fr"
              ? "À faire tous les trimestres: ouvre Gmail, va dans « More » puis « Manage subscriptions » (ou le raccourci /sub# si ton interface le propose), désabonne-toi des expéditeurs inutiles, puis vide spam et corbeille."
              : "Do this every quarter: open Gmail, go to More then Manage subscriptions (or the /sub# shortcut if your interface shows it), unsubscribe from useless senders, then empty spam and trash."}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
          <Inbox className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-3">
          {MAILBOX_CLEANUP_STEPS.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <article key={step.title.fr} className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white shadow-sm">
                    <StepIcon className="h-5 w-5 text-amber-700" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h4 className="mt-1 text-lg font-black tracking-tight text-slate-900">{step.title[locale]}</h4>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">{step.detail[locale]}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="rounded-[1.35rem] border border-amber-200 bg-amber-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
            {locale === "fr" ? "Impact environnemental estimé" : "Estimated environmental impact"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            {locale === "fr"
              ? "L'impact direct d'un nettoyage ponctuel reste faible, mais il devient utile quand il est répété tous les trimestres. Le gain vient surtout de la baisse des emails stockés et des synchronisations inutiles, avec un effet cumulé plus net si tu coupes plusieurs newsletters récurrentes."
              : "The direct impact of one cleanup stays low, but it becomes useful when repeated every quarter. The gain mainly comes from fewer stored emails and fewer unnecessary syncs, with a clearer cumulative effect if you cut several recurring newsletters."}
          </p>
          <div className="mt-3 rounded-[1.2rem] border border-amber-200 bg-white p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
              {locale === "fr" ? "Repère pratique" : "Practical reference"}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {locale === "fr"
                ? "L'ADEME recommande de supprimer les spams, nettoyer les listes de diffusion et se désabonner des newsletters jamais lues."
                : "ADEME recommends deleting spam, cleaning mailing lists, and unsubscribing from newsletters you never read."}
            </p>
            <a
              href="https://support.google.com/mail/answer/15621070?co=GENIE.Platform%3DDesktop&hl=fr"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-200 bg-amber-100 px-4 py-2 text-sm font-black text-amber-900 transition hover:-translate-y-[1px] hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70"
            >
              {locale === "fr" ? "Aide Gmail" : "Gmail help"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}

export function LearnBrowserHistoryCleanupSection({ locale }: { locale: LearnLocale }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {locale === "fr" ? "Hygiène de navigation" : "Browsing hygiene"}
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr" ? "Vider l'historique du navigateur sur « toute durée »" : "Clear browser history for \"all time\""}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
            {locale === "fr"
              ? "Le nettoyage reste simple si tu gardes seulement l'historique et le cache, sans toucher aux mots de passe ni aux paramètres de site."
              : "Cleanup stays simple if you keep only history and cache, without touching passwords or site settings."}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
          <Clock3 className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-3">
          {BROWSER_HISTORY_CLEANUP_STEPS.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <article key={step.title.fr} className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white shadow-sm">
                    <StepIcon className="h-5 w-5 text-amber-700" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h4 className="mt-1 text-lg font-black tracking-tight text-slate-900">{step.title[locale]}</h4>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">{step.detail[locale]}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="rounded-[1.35rem] border border-amber-200 bg-amber-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
            {locale === "fr" ? "Impact écologique et rythme" : "Environmental impact and cadence"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            {locale === "fr"
              ? "L'impact direct d'un nettoyage d'historique est très faible. Le vrai bénéfice est modeste mais réel quand il évite d'accumuler des données locales et de forcer des synchronisations inutiles. La cadence optimale est tous les trimestres sur un poste personnel, et après chaque usage sur un appareil partagé ou public."
              : "The direct impact of clearing history is very small. The real benefit is modest but real when it prevents local data buildup and unnecessary syncs. The optimal cadence is every quarter on a personal device, and after each use on a shared or public computer."}
          </p>
          <div className="mt-3 rounded-[1.2rem] border border-amber-200 bg-white p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
              {locale === "fr" ? "À éviter par défaut" : "Avoid by default"}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {locale === "fr"
                ? "Ne coche pas tous les éléments: laisse les mots de passe enregistrés et les paramètres de site décochés, sauf si tu fais un dépannage précis ou un nettoyage complet sur un appareil partagé."
                : "Do not select every item: leave saved passwords and site settings unchecked unless you are doing precise troubleshooting or a full cleanup on a shared device."}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

export function LearnDigitalMaintenanceSection({ locale }: { locale: LearnLocale }) {
  return (
    <section id="entretien-numerique" className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {locale === "fr" ? "Entretien numérique" : "Digital maintenance"}
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr" ? "Les petits gestes qui évitent l'encombrement" : "Small gestures that prevent clutter"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
            {locale === "fr"
              ? "Ces gestes complètent le ménage de la boîte mail et du navigateur: ils réduisent les fichiers stockés, les synchronisations inutiles et l'attention gaspillée."
              : "These gestures complement mailbox and browser cleanup: they reduce stored files, unnecessary syncs, and wasted attention."}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
          <CloudOff className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {DIGITAL_MAINTENANCE_TOPICS.map((topic) => {
          const TopicIcon = topic.icon;
          return (
            <article key={topic.title.fr} className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white shadow-sm">
                  <TopicIcon className="h-5 w-5 text-amber-700" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">{topic.cadence[locale]}</p>
                  <h4 className="mt-1 text-lg font-black tracking-tight text-slate-900">{topic.title[locale]}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">{topic.detail[locale]}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <aside className="mt-4 rounded-[1.35rem] border border-amber-200 bg-amber-50 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
          {locale === "fr" ? "Impact écologique et cadence" : "Environmental impact and cadence"}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          {locale === "fr"
            ? "L'impact d'un seul geste reste faible à moyen selon le volume de données concerné. L'effet devient plus visible quand tu combines un nettoyage trimestriel des gros volumes avec un entretien mensuel des téléchargements, favoris et notifications. La cadence optimale est donc hybride: mensuel pour le bruit du quotidien, trimestriel pour les gros stocks, semestriel pour les comptes et la synchro."
            : "The impact of a single gesture stays low to medium depending on the data volume involved. The effect becomes more visible when you combine quarterly cleanup of large volumes with monthly maintenance of downloads, bookmarks, and notifications. The optimal cadence is therefore hybrid: monthly for daily noise, quarterly for large storage, and twice-yearly for accounts and sync."}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          {locale === "fr"
            ? "Pour les pièces jointes, les doublons et les corbeilles cloud, l'ordre de priorité est: supprimer ce qui n'a plus d'usage, puis vider la corbeille associée."
            : "For attachments, duplicates, and cloud trash, the priority is: delete what is no longer useful, then empty the associated trash."}
        </p>
      </aside>
    </section>
  );
}

export function LearnRessourcesCalendarPanel({ locale }: { locale: LearnLocale }) {
  const { isOpen, handleToggle } = useDisclosureState(false);

  return (
    <details
      className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6"
      open={isOpen}
      onToggle={handleToggle}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-start justify-between gap-4 rounded-[1.35rem] px-3 py-2 outline-none transition hover:bg-slate-50/70 focus-visible:bg-slate-50/80 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/70 md:min-h-14">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {locale === "fr" ? "Calendrier léger" : "Light calendar"}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr" ? "Ouvrir le calendrier si besoin" : "Open the calendar when needed"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-700">
            {locale === "fr"
              ? "Le calendrier se charge à la demande. Les trois blocs du haut suffisent pour l'entrée rapide."
              : "The calendar loads on demand. The three blocks above are enough for the quick entry."}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
        </span>
      </summary>

      <div className="mt-4">
        {isOpen ? (
          <DeferredLearnRessourcesCalendar locale={locale} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                {locale === "fr" ? "Charge" : "Load"}
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900">{locale === "fr" ? "À la demande" : "On demand"}</p>
            </div>
            <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                {locale === "fr" ? "Usage" : "Usage"}
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {locale === "fr" ? "Support secondaire" : "Secondary support"}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                {locale === "fr" ? "Accès" : "Access"}
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {locale === "fr" ? "Une ouverture manuelle" : "Manual opening"}
              </p>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

export function LearnSortingCuesSection({ locale }: { locale: LearnLocale }) {
  const isFrench = locale === "fr";

  return (
    <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <article className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {isFrench ? "Repères de tri" : "Sorting cues"}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {isFrench ? "Les gestes qui reviennent le plus" : "The gestures that come back most often"}
          </h2>
        </div>

        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-slate-600">
            {isFrench
              ? "Les repères sont réduits à l'essentiel pour tenir en lecture rapide."
              : "The cues are reduced to the essentials so they stay quick to read."}
          </p>

          <div className="grid gap-3">
            {RESOURCE_SORTING_CUES.map((cue) => {
              const Icon = cue.icon;
              return (
                <div key={cue.title.fr} className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/80 bg-white shadow-sm">
                        <Icon size={18} className={RESOURCE_SORTING_TONE_CLASSES[cue.tone]} aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-black text-slate-900">{isFrench ? cue.title.fr : cue.title.en}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">
                          {isFrench ? cue.text.fr : cue.text.en}
                        </p>
                      </div>
                    </div>
                    <span className="hidden rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 sm:inline-flex">
                      {String(cue.title.fr.length).padStart(2, "0")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </article>

      <div className="space-y-4">
        <LearnArtworkAccordion locale={locale} />
      </div>
    </section>
  );
}

export function LearnRessourcesOverview({ locale }: { locale: LearnLocale }) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="grid gap-4 md:grid-cols-3">
        {RESOURCE_SPOTLIGHTS.map((spotlight, index) => (
          <ResourceSpotlightCard key={spotlight.key} locale={locale} spotlight={spotlight} index={index + 1} />
        ))}
      </div>

      <aside className="rounded-[1.85rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
              {locale === "fr" ? "Aperçu immédiat" : "Immediate overview"}
            </p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
              {locale === "fr" ? "Deux rendez-vous visibles" : "Two visible meetups"}
            </h3>
          </div>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {LEARN_RESOURCE_EVENTS.map((event) => (
            <EventRow key={event.title} locale={locale} title={event.title} start={event.start} end={event.end} />
          ))}
        </div>

        <div className="mt-4 rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {locale === "fr" ? "Orientation" : "Orientation"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {locale === "fr"
              ? "Le calendrier reste un support. Les trois blocs du haut servent d'entrée rapide."
              : "The calendar stays supportive. The three blocks above are the quick entry points."}
          </p>
          <Link
            href="#calendrier"
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-900 transition hover:-translate-y-[1px] hover:bg-slate-50"
          >
            {locale === "fr" ? "Voir le calendrier" : "View the calendar"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </aside>
    </section>
  );
}

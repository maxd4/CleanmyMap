"use client";

import { ArrowRight, CloudOff, Clock3, Inbox } from "lucide-react";

import type { LearnLocale } from "@/lib/learning/learn-rubric-data";

import {
  BROWSER_HISTORY_CLEANUP_STEPS,
  DIGITAL_MAINTENANCE_TOPICS,
  MAILBOX_CLEANUP_STEPS,
} from "./learn-ressources-client.data";

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

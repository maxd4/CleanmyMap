import {
  ArrowRight,
  ExternalLink,
  HardDrive,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";
import {
  NUMERIQUE_CONTENT,
  NUMERIQUE_CO2_FACTORS,
  NUMERIQUE_GMAIL_SUBSCRIPTIONS_SHORTCUT,
  NUMERIQUE_ORDER_OF_MAGNITUDE,
  NUMERIQUE_SOURCES,
  NUMERIQUE_TUTORIAL,
} from "@/lib/learning/practice/numerique";

function formatNumber(locale: LearnLocale, value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    maximumFractionDigits,
  }).format(value);
}

function ExternalSourceLink({
  locale,
  sourceId,
}: {
  locale: LearnLocale;
  sourceId: string;
}) {
  const source = NUMERIQUE_SOURCES.find((candidate) => candidate.id === sourceId);
  if (!source) {
    return null;
  }

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-semibold text-amber-800 underline decoration-amber-300 underline-offset-2 hover:text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
    >
      {source.label[locale]}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  );
}

export function LearnNumeriqueThemePanel({
  locale,
  tabId,
  panelId,
}: {
  locale: LearnLocale;
  tabId: string;
  panelId: string;
}) {
  const futureSpam = NUMERIQUE_ORDER_OF_MAGNITUDE.futureSpam;
  const cloudStorage = NUMERIQUE_ORDER_OF_MAGNITUDE.cloudStorage;

  return (
    <section
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      className="space-y-4"
    >
      <CmmCard tone="amber" variant="elevated" className="space-y-5 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl space-y-2">
            <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
              {locale === "fr" ? "Sobriété numérique" : "Digital sobriety"}
            </p>
            <h3 className="text-2xl font-black tracking-tight cmm-text-primary md:text-3xl">
              {locale === "fr" ? "Nettoyer Gmail avec le bon ordre de priorité" : "Clean Gmail in the right order"}
            </h3>
            <p className="cmm-text-small leading-relaxed cmm-text-secondary">
              {NUMERIQUE_CONTENT.summary[locale]}
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-white px-3 py-1.5 cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-900">
            {locale === "fr" ? "Faits + estimations" : "Facts + estimates"}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-[1.2rem] border border-amber-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
                <HardDrive className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
                  {locale === "fr" ? "Fait" : "Fact"}
                </p>
                <p className="mt-2 cmm-text-small leading-relaxed cmm-text-primary">
                  {NUMERIQUE_CONTENT.facts[0].text[locale]}
                </p>
              </div>
            </div>
          </article>
          <article className="rounded-[1.2rem] border border-amber-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
                <Mail className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
                  {locale === "fr" ? "Fait à garder en tête" : "Fact to keep in mind"}
                </p>
                <p className="mt-2 cmm-text-small leading-relaxed cmm-text-primary">
                  {NUMERIQUE_CONTENT.facts[1].text[locale]}
                </p>
              </div>
            </div>
          </article>
        </div>

        <section className="rounded-[1.4rem] border border-amber-200 bg-amber-50/70 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
                {locale === "fr" ? "Estimations / équivalences" : "Estimates / equivalences"}
              </p>
              <h4 className="mt-1 text-xl font-black tracking-tight cmm-text-primary">
                {locale === "fr" ? "Deux ordres de grandeur, sans promesse excessive" : "Two orders of magnitude, without overclaiming"}
              </h4>
            </div>
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-white px-3 py-1.5 cmm-text-caption font-black uppercase tracking-[0.15em] text-amber-800">
              {locale === "fr" ? "Calcul dérivé" : "Derived calculation"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-[1.2rem] border border-amber-200 bg-white p-4">
              <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-700">
                {locale === "fr" ? "Futurs spams évités" : "Future spam avoided"}
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight text-amber-900">
                {formatNumber(locale, futureSpam.equivalentCarKm)} km
              </p>
              <p className="mt-1 cmm-text-small leading-relaxed cmm-text-secondary">
                {locale === "fr"
                  ? "1 000 futurs spams évités ≈ 22 km en voiture thermique moyenne essence."
                  : "1,000 future spam messages avoided ≈ 22 km in an average petrol car."}
              </p>
              <p className="mt-2 cmm-text-caption text-amber-800">
                {formatNumber(locale, futureSpam.co2eGrams)} gCO₂e = {formatNumber(locale, futureSpam.count)} × {formatNumber(locale, NUMERIQUE_CO2_FACTORS.unreadSpamGramsPerEmail)} g ÷ {formatNumber(locale, NUMERIQUE_CO2_FACTORS.averagePetrolCarGramsPerKm)} g/km
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-amber-200 bg-white p-4">
              <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-700">
                {locale === "fr" ? "Stockage conservé" : "Storage kept"}
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight text-amber-900">
                {formatNumber(locale, cloudStorage.equivalentCarKm)} km
              </p>
              <p className="mt-1 cmm-text-small leading-relaxed cmm-text-secondary">
                {locale === "fr"
                  ? "100 Go stockés pendant un an ≈ 0,14 km en voiture thermique moyenne essence."
                  : "100 GB stored for one year ≈ 0.14 km in an average petrol car."}
              </p>
              <p className="mt-2 cmm-text-caption text-amber-800">
                {formatNumber(locale, cloudStorage.co2eGrams)} gCO₂e = {formatNumber(locale, cloudStorage.gigabytes)} Go × {formatNumber(locale, NUMERIQUE_CO2_FACTORS.cloudStorageGramsPerGbYear)} g/Go/an ÷ {formatNumber(locale, NUMERIQUE_CO2_FACTORS.averagePetrolCarGramsPerKm)} g/km
              </p>
            </div>
          </div>
          <p className="mt-4 cmm-text-small leading-relaxed cmm-text-secondary">
            {locale === "fr"
              ? "Ces kilomètres sont des équivalences calculées, pas des trajets réellement évités. Supprimer 1 000 spams déjà reçus n’économise donc pas 22 km : l’ordre de grandeur de 22 km concerne des futurs envois évités."
              : "These kilometers are calculated equivalences, not trips actually avoided. Deleting 1,000 messages already received therefore does not save 22 km: the 22 km order of magnitude concerns future messages avoided."}
          </p>
        </section>
      </CmmCard>

      <CmmCard tone="amber" variant="outlined" className="space-y-4 p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
              {locale === "fr" ? "Recommandation · tutoriel Gmail" : "Recommendation · Gmail tutorial"}
            </p>
            <h4 className="mt-1 text-xl font-black tracking-tight cmm-text-primary">
              {locale === "fr" ? "Quatre gestes courts" : "Four short actions"}
            </h4>
          </div>
        </div>

        <ol className="grid gap-3 md:grid-cols-2">
          {NUMERIQUE_TUTORIAL.map((step, index) => (
            <li key={step.id} className="rounded-[1.2rem] border border-amber-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 cmm-text-caption font-black text-amber-900">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h5 className="text-base font-black tracking-tight cmm-text-primary">{step.title[locale]}</h5>
                  <p className="mt-2 cmm-text-small font-semibold leading-relaxed cmm-text-primary">{step.instruction[locale]}</p>
                  <p className="mt-2 cmm-text-small leading-relaxed cmm-text-secondary">{step.detail[locale]}</p>
                  {step.id === "unsubscribe" ? (
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 cmm-text-caption">
                      <a
                        href={NUMERIQUE_GMAIL_SUBSCRIPTIONS_SHORTCUT}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-black text-amber-800 underline decoration-amber-300 underline-offset-2 hover:text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                      >
                        {locale === "fr" ? "Essayer le raccourci /#sub" : "Try the /#sub shortcut"}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                      <ExternalSourceLink locale={locale} sourceId="gmail-unsubscribe" />
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-2 border-t border-amber-100 pt-4 cmm-text-caption text-amber-900">
          <ExternalSourceLink locale={locale} sourceId="gmail-subscriptions" />
          <ExternalSourceLink locale={locale} sourceId="gmail-cleanup" />
        </div>
      </CmmCard>

      <details className="group rounded-[1.35rem] border border-amber-200 bg-white px-4 py-3 shadow-sm">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
          <div className="space-y-1 pr-4">
            <p className="text-base font-black tracking-tight cmm-text-primary">
              {locale === "fr" ? "Sources et méthode" : "Sources and method"}
            </p>
            <p className="cmm-text-small leading-relaxed cmm-text-secondary">
              {locale === "fr"
                ? "Les sources restent repliées pour garder le tutoriel lisible. Les facteurs sont repris tels quels, puis les équivalences sont calculées par division par 170 gCO₂e/km."
                : "Sources stay collapsed to keep the tutorial readable. Factors are used as stated, then equivalences are calculated by dividing by 170 gCO₂e/km."}
            </p>
          </div>
          <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 transition group-open:rotate-90">
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </summary>

        <div className="mt-4 space-y-3 border-t border-amber-100 pt-4 cmm-text-small leading-relaxed cmm-text-secondary">
          <p>
            {locale === "fr"
              ? "Faits :"
              : "Facts:"}{" "}
            <ExternalSourceLink locale={locale} sourceId="impact-spam" />{", "}
            <ExternalSourceLink locale={locale} sourceId="impact-cloud-storage" />{" et "}
            <ExternalSourceLink locale={locale} sourceId="impact-petrol-car" />.
          </p>
          <p>
            {locale === "fr"
              ? "Méthode : 1 000 × 3,74 gCO₂e = 3 740 gCO₂e ; 100 × 0,24 gCO₂e = 24 gCO₂e ; chaque résultat est ensuite rapporté à 170 gCO₂e/km."
              : "Method: 1,000 × 3.74 gCO₂e = 3,740 gCO₂e; 100 × 0.24 gCO₂e = 24 gCO₂e; each result is then divided by 170 gCO₂e/km."}
          </p>
          <p>
            {locale === "fr"
              ? "Limite : ces facteurs ne mesurent ni votre boîte Gmail, ni les émissions historiques d’un message. Ils servent uniquement à illustrer des ordres de grandeur et à prioriser l’évitement des futurs envois."
              : "Limit: these factors measure neither your Gmail mailbox nor a message's historical emissions. They only illustrate orders of magnitude and help prioritize avoiding future messages."}
          </p>
        </div>
      </details>

    </section>
  );
}

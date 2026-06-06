import Link from "next/link";
import { ArrowRight, Megaphone, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";

type LocalizedText = {
  fr: string;
  en: string;
};

type AwarenessCard = {
  title: LocalizedText;
  lead: LocalizedText;
  bullets: LocalizedText[];
  href: string;
  sourceLabel: LocalizedText;
  sourceHint: LocalizedText;
  icon: typeof Megaphone;
  tone: "amber" | "emerald" | "sky";
};

const AWARENESS_CARDS: AwarenessCard[] = [
  {
    title: {
      fr: "Montrer l’exemple",
      en: "Lead by example",
    },
    lead: {
      fr: "Gestes Propres rappelle qu’en matière de propreté, le fait de montrer le bon geste joue sur les normes sociales et aide à faire évoluer les comportements.",
      en: "Gestes Propres notes that in cleanliness matters, showing the right gesture influences social norms and helps behavior evolve.",
    },
    bullets: [
      {
        fr: "Un geste visible vaut plus qu’un long discours.",
        en: "A visible gesture matters more than a long speech.",
      },
      {
        fr: "Quand le tri est simple à voir, il devient plus facile à reproduire.",
        en: "When sorting is easy to see, it becomes easier to copy.",
      },
      {
        fr: "Les défis partagés renforcent l’envie d’agir avec les autres.",
        en: "Shared challenges strengthen the desire to act with others.",
      },
    ],
    href: "https://www.gestespropres.com/relever-un-defi",
    sourceLabel: {
      fr: "Gestes Propres",
      en: "Gestes Propres",
    },
    sourceHint: {
      fr: "Défis, norme sociale et mise en visibilité du bon geste.",
      en: "Challenges, social norms and making the right gesture visible.",
    },
    icon: Users,
    tone: "emerald",
  },
  {
    title: {
      fr: "Accompagner le changement",
      en: "Support behavior change",
    },
    lead: {
      fr: "L’ADEME insiste sur les leviers de communication, de sensibilisation et d’événements pour faire adopter un nouveau geste de tri.",
      en: "ADEME highlights communication, awareness and event-based levers to help people adopt a new sorting gesture.",
    },
    bullets: [
      {
        fr: "Identifier les freins aide à choisir le bon message.",
        en: "Identifying barriers helps choose the right message.",
      },
      {
        fr: "Un bon support pédagogique sert aussi à évaluer l’adhésion.",
        en: "A good educational support also helps measure adoption.",
      },
      {
        fr: "Le geste s’installe mieux quand il est expliqué, montré et répété.",
        en: "The gesture sticks better when it is explained, shown and repeated.",
      },
    ],
    href: "https://economie-circulaire.ademe.fr/tri-biodechets",
    sourceLabel: {
      fr: "ADEME",
      en: "ADEME",
    },
    sourceHint: {
      fr: "Communication, sensibilisation et outils d’accompagnement.",
      en: "Communication, awareness and behavior-change tools.",
    },
    icon: Megaphone,
    tone: "amber",
  },
  {
    title: {
      fr: "Prévention collective",
      en: "Collective prevention",
    },
    lead: {
      fr: "Le ministère rappelle qu’une politique efficace combine prévention, sensibilisation, communication, collecte adaptée et, si nécessaire, sanction.",
      en: "The ministry stresses that effective policy combines prevention, awareness, communication, adapted collection and, when needed, enforcement.",
    },
    bullets: [
      {
        fr: "Le bon comportement dépend aussi de l’environnement proposé.",
        en: "The right behavior also depends on the environment provided.",
      },
      {
        fr: "Un dispositif clair réduit les abandons et facilite le tri.",
        en: "A clear setup reduces littering and makes sorting easier.",
      },
      {
        fr: "Prévenir, c’est d’abord rendre les bons réflexes faciles à comprendre.",
        en: "Prevention starts by making the right reflexes easy to understand.",
      },
    ],
    href: "https://www.ecologie.gouv.fr/politiques-publiques/lutte-contre-depots-illegaux-dechets",
    sourceLabel: {
      fr: "Ministère",
      en: "Ministry",
    },
    sourceHint: {
      fr: "Prévention, sensibilisation et communication locale.",
      en: "Prevention, awareness and local communication.",
    },
    icon: ShieldCheck,
    tone: "sky",
  },
];

const TONE_CLASSES: Record<AwarenessCard["tone"], { shell: string; badge: string; accent: string; border: string }> =
  {
    amber: {
      shell: "border-amber-200 bg-[linear-gradient(180deg,rgba(255,248,231,0.98),rgba(255,255,255,0.98))]",
      badge: "border-amber-200 bg-amber-50 text-amber-900",
      accent: "text-amber-700",
      border: "border-amber-200",
    },
    emerald: {
      shell: "border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(255,255,255,0.98))]",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-900",
      accent: "text-emerald-700",
      border: "border-emerald-200",
    },
    sky: {
      shell: "border-sky-200 bg-[linear-gradient(180deg,rgba(240,249,255,0.98),rgba(255,255,255,0.98))]",
      badge: "border-sky-200 bg-sky-50 text-sky-900",
      accent: "text-sky-700",
      border: "border-sky-200",
    },
  };

export function LearnBehaviorAwarenessSection({ locale }: { locale: LearnLocale }) {
  return (
    <section className="rounded-[2rem] border border-amber-200/80 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
            {locale === "fr" ? "Comportement et sensibilisation" : "Behavior and awareness"}
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr"
              ? "Le tri s’installe mieux quand le bon geste est visible, expliqué et répété"
              : "Sorting sticks better when the right gesture is visible, explained and repeated"}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {locale === "fr"
              ? "On s’appuie ici sur Gestes Propres, l’ADEME et le ministère: montrer l’exemple, choisir les bons leviers de sensibilisation et rendre le message simple à suivre."
              : "This section draws on Gestes Propres, ADEME and the ministry: lead by example, choose the right awareness levers and keep the message easy to follow."}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
          <Megaphone className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {AWARENESS_CARDS.map((card) => {
          const Icon = card.icon;
          const tone = TONE_CLASSES[card.tone];

          return (
            <article key={card.title.fr} className={cn("rounded-[1.6rem] border p-4 shadow-sm", tone.shell, tone.border)}>
              <div className="flex items-start justify-between gap-3">
                <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-2xl border", tone.badge)}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {card.sourceLabel[locale]}
                </span>
              </div>

              <h4 className="mt-4 text-lg font-black tracking-tight text-slate-900">
                {card.title[locale]}
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.lead[locale]}</p>

              <ul className="mt-4 space-y-2">
                {card.bullets.map((bullet) => (
                  <li
                    key={bullet.fr}
                    className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-700"
                  >
                    <span
                      className={cn(
                        "mt-1 h-2 w-2 shrink-0 rounded-full",
                        card.tone === "amber" ? "bg-amber-500" : card.tone === "emerald" ? "bg-emerald-500" : "bg-sky-500",
                      )}
                    />
                    <span>{bullet[locale]}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {locale === "fr" ? "Source" : "Source"}
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-900">{card.sourceHint[locale]}</p>
                </div>
                <Link
                  href={card.href}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] transition hover:-translate-y-[1px]",
                    tone.badge,
                  )}
                >
                  {card.sourceLabel[locale]}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

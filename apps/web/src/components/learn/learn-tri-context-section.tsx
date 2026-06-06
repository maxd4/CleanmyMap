import Link from "next/link";
import { AlertTriangle, Compass, Droplets, MapPinned, PartyPopper, Sprout, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";

type LocalizedText = {
  fr: string;
  en: string;
};

type DecisionStep = {
  title: LocalizedText;
  detail: LocalizedText;
  icon: LucideIcon;
  tone: "amber" | "sky" | "emerald";
};

type ContextCard = {
  title: LocalizedText;
  context: LocalizedText;
  decision: LocalizedText;
  fallback: LocalizedText;
  href: string;
  hrefLabel: LocalizedText;
  icon: LucideIcon;
  tone: "amber" | "sky" | "emerald" | "violet" | "rose";
};

type EdgeCaseCard = {
  title: LocalizedText;
  problem: LocalizedText;
  response: LocalizedText;
  href: string;
  hrefLabel: LocalizedText;
  icon: LucideIcon;
  tone: "amber" | "sky" | "emerald" | "violet" | "rose";
};

const TONE_CLASSES: Record<
  DecisionStep["tone"] | ContextCard["tone"],
  { shell: string; badge: string; accent: string }
> = {
  amber: {
    shell: "border-amber-200 bg-amber-50/70",
    badge: "bg-amber-100 text-amber-900",
    accent: "text-amber-700",
  },
  sky: {
    shell: "border-sky-200 bg-sky-50/70",
    badge: "bg-sky-100 text-sky-900",
    accent: "text-sky-700",
  },
  emerald: {
    shell: "border-emerald-200 bg-emerald-50/70",
    badge: "bg-emerald-100 text-emerald-900",
    accent: "text-emerald-700",
  },
  violet: {
    shell: "border-violet-200 bg-violet-50/70",
    badge: "bg-violet-100 text-violet-900",
    accent: "text-violet-700",
  },
  rose: {
    shell: "border-rose-200 bg-rose-50/70",
    badge: "bg-rose-100 text-rose-900",
    accent: "text-rose-700",
  },
};

const DECISION_STEPS: DecisionStep[] = [
  {
    title: { fr: "Repérer le contexte", en: "Spot the context" },
    detail: {
      fr: "Identifier si l'on est sur le terrain, à la plage, en ville, en événement ou sur une logique de compost domestique.",
      en: "Identify whether you're on the field, at the beach, in the city, at an event or working from a home-compost setup.",
    },
    icon: MapPinned,
    tone: "amber",
  },
  {
    title: { fr: "Vérifier la consigne locale", en: "Check the local rule" },
    detail: {
      fr: "Chercher le bac, le panneau ou la consigne de l'organisation avant d'appliquer une règle générale.",
      en: "Look for the bin, sign or organizer instruction before applying a general rule.",
    },
    icon: Compass,
    tone: "sky",
  },
  {
    title: { fr: "Choisir le geste sûr", en: "Choose the safe gesture" },
    detail: {
      fr: "Quand le doute reste là, choisir la solution la moins risquée pour la filière et garder le message simple.",
      en: "When doubt remains, choose the least risky option for the stream and keep the message simple.",
    },
    icon: Sprout,
    tone: "emerald",
  },
];

const CONTEXT_CARDS: ContextCard[] = [
  {
    title: { fr: "Action terrain", en: "Field action" },
    context: {
      fr: "Sur une action de nettoyage, le bon réflexe est de trier au fil de l'eau sans ralentir le groupe.",
      en: "During a cleanup, the right reflex is to sort on the fly without slowing the group down.",
    },
    decision: {
      fr: "Préparer un point de tri clair, garder une consigne courte et faire remonter les déchets incertains à part.",
      en: "Prepare a clear sorting point, keep the rule short and set uncertain items aside.",
    },
    fallback: {
      fr: "Si le geste n'est pas clair, isoler le déchet plutôt que de l'envoyer dans le mauvais flux.",
      en: "If the gesture is unclear, isolate the item rather than pushing it into the wrong stream.",
    },
    href: "/sections/recycling",
    hrefLabel: { fr: "Voir le guide tri", en: "Open sorting guide" },
    icon: MapPinned,
    tone: "emerald",
  },
  {
    title: { fr: "Plage", en: "Beach" },
    context: {
      fr: "Sur le sable, les déchets sont souvent dispersés, sales ou difficiles à identifier rapidement.",
      en: "On the sand, waste is often scattered, dirty or hard to identify quickly.",
    },
    decision: {
      fr: "Faire d'abord une lecture visuelle, séparer les objets douteux et garder un sac ou un bac pour les cas ambigus.",
      en: "Start with a visual scan, separate doubtful items and keep a bag or bin for ambiguous cases.",
    },
    fallback: {
      fr: "Quand l'objet est trop dégradé, éviter de deviner et passer par le tri résiduel ou le signalement local.",
      en: "When an item is too degraded, avoid guessing and route it to residual waste or local reporting.",
    },
    href: "/sections/trash-spotter",
    hrefLabel: { fr: "Voir le signalement", en: "Open reporting guide" },
    icon: Droplets,
    tone: "sky",
  },
  {
    title: { fr: "Ville", en: "City" },
    context: {
      fr: "En rue ou en pied d'immeuble, on doit composer avec des consignes visibles, des flux mélangés et parfois des bacs absents.",
      en: "In the street or around buildings, you deal with visible rules, mixed streams and sometimes missing bins.",
    },
    decision: {
      fr: "Lire d'abord les panneaux, puis appliquer la règle locale la plus précise disponible.",
      en: "Read the signage first, then apply the most precise local rule available.",
    },
    fallback: {
      fr: "Si aucune consigne n'est visible, choisir le flux le moins risqué et demander confirmation ensuite.",
      en: "If no rule is visible, choose the least risky stream and confirm afterward.",
    },
    href: "/sections/recycling",
    hrefLabel: { fr: "Voir le tri urbain", en: "Open urban sorting" },
    icon: Compass,
    tone: "violet",
  },
  {
    title: { fr: "Événement", en: "Event" },
    context: {
      fr: "Sur un événement, la densité de public impose des messages encore plus courts et des emplacements de tri lisibles.",
      en: "At events, crowd density calls for even shorter messages and highly legible sorting points.",
    },
    decision: {
      fr: "Installer un parcours simple, un point de tri central et une consigne unique que tout le monde peut répéter.",
      en: "Set up a simple flow, a central sorting point and one rule that everyone can repeat.",
    },
    fallback: {
      fr: "Si le matériel manque, simplifier la consigne plutôt que multiplier les exceptions.",
      en: "If equipment is missing, simplify the rule rather than multiplying exceptions.",
    },
    href: "/actions/new",
    hrefLabel: { fr: "Voir le suivi d'action", en: "Open action tracking" },
    icon: PartyPopper,
    tone: "amber",
  },
  {
    title: { fr: "Compost domestique", en: "Home compost" },
    context: {
      fr: "À la maison, le tri dépend de l'équipement disponible et de la capacité réelle à composter sans erreur.",
      en: "At home, sorting depends on the equipment available and the real ability to compost without mistakes.",
    },
    decision: {
      fr: "Vérifier ce qui est accepté localement, puis séparer ce qui part au compost de ce qui doit rester en résiduel.",
      en: "Check what is locally accepted, then separate compostable items from what must remain residual.",
    },
    fallback: {
      fr: "Si le compost n'est pas possible, garder une filière simple et lisible plutôt que forcer un mauvais geste.",
      en: "If composting is not possible, keep a simple readable path instead of forcing a bad gesture.",
    },
    href: "/sections/compost",
    hrefLabel: { fr: "Voir le compost", en: "Open compost guide" },
    icon: Sprout,
    tone: "emerald",
  },
];

const EDGE_CASE_CARDS: EdgeCaseCard[] = [
  {
    title: { fr: "Déchet non identifiable", en: "Unidentified waste" },
    problem: {
      fr: "L'objet est trop abîmé, trop sale ou trop mixte pour être identifié vite.",
      en: "The item is too damaged, dirty or mixed to identify quickly.",
    },
    response: {
      fr: "Ne pas deviner: isoler l'objet, regarder s'il existe une consigne locale et choisir le flux le plus sûr.",
      en: "Do not guess: set it aside, check whether there is a local rule and choose the safest stream.",
    },
    href: "/sections/recycling",
    hrefLabel: { fr: "Revoir le tri", en: "Review sorting" },
    icon: AlertTriangle,
    tone: "rose",
  },
  {
    title: { fr: "Déchet souillé", en: "Soiled waste" },
    problem: {
      fr: "Le gras, les restes ou la contamination risquent de salir la filière de tri.",
      en: "Grease, leftovers or contamination risk dirtying the sorting stream.",
    },
    response: {
      fr: "Quand c'est trop souillé, éviter de contaminer le recyclage et basculer vers la solution résiduelle si besoin.",
      en: "When it is too dirty, avoid contaminating recycling and fall back to residual waste if needed.",
    },
    href: "/sections/recycling",
    hrefLabel: { fr: "Vérifier les exceptions", en: "Check exceptions" },
    icon: AlertTriangle,
    tone: "amber",
  },
  {
    title: { fr: "Compost impossible", en: "Composting impossible" },
    problem: {
      fr: "Le lieu, l'équipement ou le volume rendent le compost impossible à tenir correctement.",
      en: "The place, equipment or volume makes composting impossible to keep correctly.",
    },
    response: {
      fr: "Ne pas forcer le compost: garder un tri lisible, suivre la filière disponible et documenter le besoin si le contexte revient souvent.",
      en: "Do not force composting: keep sorting readable, follow the available stream and document the need if the context repeats.",
    },
    href: "/sections/compost",
    hrefLabel: { fr: "Revoir le compost", en: "Review compost" },
    icon: Sprout,
    tone: "emerald",
  },
  {
    title: { fr: "Matériel absent", en: "Missing equipment" },
    problem: {
      fr: "Le bon bac, le sac ou l'étiquette ne sont pas là au moment d'agir.",
      en: "The right bin, bag or label is missing when it's time to act.",
    },
    response: {
      fr: "Simplifier la consigne, utiliser le point de tri disponible et éviter de créer une règle improvisée.",
      en: "Simplify the rule, use the available sorting point and avoid inventing a rule on the spot.",
    },
    href: "/actions/new",
    hrefLabel: { fr: "Voir le suivi", en: "Open tracking" },
    icon: MapPinned,
    tone: "sky",
  },
  {
    title: { fr: "Consigne locale ambiguë", en: "Ambiguous local rule" },
    problem: {
      fr: "Deux messages se contredisent ou le panneau ne suffit pas à trancher.",
      en: "Two messages conflict or the sign is not enough to decide.",
    },
    response: {
      fr: "Appliquer la règle la plus locale et la plus précise, puis demander clarification plutôt que généraliser à la hâte.",
      en: "Apply the most local and specific rule, then ask for clarification instead of generalizing too fast.",
    },
    href: "/sections/trash-spotter",
    hrefLabel: { fr: "Voir le signalement", en: "Open reporting" },
    icon: Compass,
    tone: "violet",
  },
];

function StepCard({ locale, step }: { locale: LearnLocale; step: DecisionStep }) {
  const Icon = step.icon;
  const tone = TONE_CLASSES[step.tone];

  return (
    <article className={cn("rounded-[1.5rem] border p-4 shadow-sm", tone.shell)}>
      <div className="flex items-center justify-between gap-3">
        <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em]", tone.badge)}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {step.title[locale]}
        </span>
        <span className={cn("text-[10px] font-black uppercase tracking-[0.18em]", tone.accent)}>
          {locale === "fr" ? "Étape" : "Step"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">{step.detail[locale]}</p>
    </article>
  );
}

function ScenarioCard({
  locale,
  card,
}: {
  locale: LearnLocale;
  card: ContextCard | EdgeCaseCard;
}) {
  const Icon = card.icon;
  const tone = TONE_CLASSES[card.tone];

  return (
    <article className={cn("flex h-full flex-col rounded-[1.6rem] border p-4 shadow-sm", tone.shell)}>
      <div className="flex items-start justify-between gap-3">
        <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-2xl border", tone.badge)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          {locale === "fr" ? "Décision" : "Decision"}
        </span>
      </div>

      <h4 className="mt-4 text-lg font-black tracking-tight text-slate-900">{card.title[locale]}</h4>

      {"context" in card ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.context[locale]}</p>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.problem[locale]}</p>
      )}

      <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            {locale === "fr" ? "Réflexe" : "Reflex"}
          </p>
          <p className="mt-1 text-sm font-medium leading-relaxed text-slate-700">
            {"decision" in card ? card.decision[locale] : card.response[locale]}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            {locale === "fr" ? "Quand ça bloque" : "When it blocks"}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {"fallback" in card ? card.fallback[locale] : card.response[locale]}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Link
          href={card.href}
          className={cn(
            "inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-black uppercase tracking-[0.18em] transition hover:-translate-y-[1px]",
            tone.badge,
          )}
        >
          {card.hrefLabel[locale]}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export function LearnTriContextSection({ locale }: { locale: LearnLocale }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="max-w-3xl">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-700">
          {locale === "fr" ? "Chemins de décision" : "Decision paths"}
        </p>
        <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
          {locale === "fr"
            ? "Le bon geste change selon le contexte"
            : "The right gesture changes with the context"}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {locale === "fr"
            ? "On commence par le lieu, on lit la consigne locale, puis on choisit la solution la moins risquée. Cette logique évite les improvisations et garde le tri lisible."
            : "Start with the place, read the local rule, then choose the least risky option. This logic avoids improvisation and keeps sorting readable."}
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {DECISION_STEPS.map((step) => (
          <StepCard key={step.title.fr} locale={locale} step={step} />
        ))}
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              {locale === "fr" ? "Par contexte" : "By context"}
            </p>
            <h4 className="mt-1 text-xl font-black tracking-tight text-slate-900">
              {locale === "fr"
                ? "Des raccourcis de décision pour chaque situation"
                : "Decision shortcuts for each situation"}
            </h4>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            5
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {CONTEXT_CARDS.map((card) => (
            <ScenarioCard key={card.title.fr} locale={locale} card={card} />
          ))}
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            {locale === "fr" ? "Cas limites" : "Edge cases"}
          </p>
          <h4 className="mt-1 text-xl font-black tracking-tight text-slate-900">
            {locale === "fr"
              ? "Quand le contexte devient flou, on garde des garde-fous"
              : "When the context gets fuzzy, keep guardrails"}
          </h4>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            {locale === "fr"
              ? "Ces cas reviennent souvent sur le terrain: ne pas deviner, ne pas contaminer une filière et ne pas inventer une règle locale quand l'information manque."
              : "These cases show up often on the ground: don't guess, don't contaminate a stream and don't invent a local rule when information is missing."}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {EDGE_CASE_CARDS.map((card) => (
            <ScenarioCard key={card.title.fr} locale={locale} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}

import { ArrowRight, Megaphone, MapPinned, Target, type LucideIcon } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { cn } from "@/lib/utils";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";

type LocalizedText = {
  fr: string;
  en: string;
};

type ActionItem = {
  icon: LucideIcon;
  title: LocalizedText;
  detail: LocalizedText;
  href: string;
  cta: LocalizedText;
};

const ACTION_ITEMS: ActionItem[] = [
  {
    icon: Megaphone,
    title: { fr: "Rendre le geste visible", en: "Make the gesture visible" },
    detail: {
      fr: "Un rappel simple au bon endroit réduit l’hésitation et aide à faire le bon choix.",
      en: "A simple reminder in the right place reduces hesitation and helps people choose well.",
    },
    href: "/sections/trash-spotter",
    cta: { fr: "Signaler", en: "Report" },
  },
  {
    icon: MapPinned,
    title: { fr: "Montrer la bonne filière", en: "Show the right stream" },
    detail: {
      fr: "Quand la solution est claire, la collecte et l’orientation deviennent plus faciles.",
      en: "When the solution is clear, collection and orientation become easier.",
    },
    href: "/actions/map",
    cta: { fr: "Consulter la carte", en: "Open map" },
  },
  {
    icon: Target,
    title: { fr: "Agir avant le déchet", en: "Act before the waste" },
    detail: {
      fr: "Réduire à la source évite de créer un déchet qu’il faudra ensuite gérer.",
      en: "Reducing at source avoids creating waste that must be handled later.",
    },
    href: "/actions/new",
    cta: { fr: "Réduire à la source", en: "Reduce at source" },
  },
];

function ActionCard({ locale, item }: { locale: LearnLocale; item: ActionItem }) {
  const Icon = item.icon;

  return (
    <CmmCard tone="amber" variant="outlined" className="flex h-full flex-col justify-between gap-3 p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
              {locale === "fr" ? "Enseignement" : "Teaching"}
            </p>
            <h4 className="mt-1 text-lg font-black tracking-tight cmm-text-primary">{item.title[locale]}</h4>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <p className="cmm-text-small leading-relaxed cmm-text-secondary">{item.detail[locale]}</p>
      </div>

      <CmmButton
        href={item.href}
        tone="secondary"
        variant="pill"
        className="mt-2 w-full justify-between px-4 py-3 cmm-text-caption font-black uppercase tracking-[0.18em]"
      >
        {item.cta[locale]}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </CmmButton>
    </CmmCard>
  );
}

export function LearnGestesPropresCollectiveActionSection({
  locale,
  className,
}: {
  locale: LearnLocale;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.98))] p-4 shadow-sm md:p-5",
        className,
      )}
    >
      <div className="space-y-4">
        <div className="max-w-3xl space-y-2">
          <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
            {locale === "fr" ? "Action collective" : "Collective action"}
          </p>
          <h3 className="text-2xl font-black tracking-tight cmm-text-primary md:text-3xl">
            {locale === "fr"
              ? "Le bon geste devient visible et collectif"
              : "The right gesture becomes visible and collective"}
          </h3>
          <p className="cmm-text-small leading-relaxed cmm-text-secondary">
            {locale === "fr"
              ? "Un rappel, une filière claire et une action à la source suffisent pour faire suivre le geste utile."
              : "A reminder, a clear stream and an upstream action are enough to spread the useful gesture."}
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {ACTION_ITEMS.map((item) => (
            <ActionCard key={item.href} locale={locale} item={item} />
          ))}
        </div>

        <p className="rounded-[1.2rem] border border-amber-200 bg-white px-4 py-3 cmm-text-small leading-relaxed cmm-text-secondary">
          {locale === "fr"
            ? "Aucune promesse d’impact n’est avancée ici: le bloc sert seulement à orienter vers des actions disponibles."
            : "No impact promise is made here: the block only points to available actions."}
        </p>
      </div>
    </section>
  );
}

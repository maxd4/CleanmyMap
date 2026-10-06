import { PageHeader } from "@/components/ui/page-header";
import { FEEDBACK_METRICS, localize, type Locale } from "./feedback-section.shared";

export function FeedbackSectionDashboardHeader({
  locale,
  fr,
}: {
  locale: Locale;
  fr: boolean;
}) {
  return (
    <header className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
      <div className="space-y-6">
        <PageHeader
          title={fr ? "Retours & Qualité" : "Feedback & Quality"}
          subtitle={
            fr
              ? "Vos retours nous aident à améliorer CleanMyMap en continu et à garantir des données fiables et utiles pour tous."
              : "Your feedback helps us improve CleanMyMap continuously and keep the data reliable and useful for everyone."
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {FEEDBACK_METRICS.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={localize(locale, metric.label)}
              className="rounded-[1.5rem] border border-rose-200/70 bg-white/90 p-5 shadow-[0_18px_48px_-42px_rgba(236,72,153,0.35)] backdrop-blur-sm"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-500">
                <Icon size={18} />
              </div>
              <p className="mt-4 cmm-text-caption font-black uppercase tracking-[0.18em] text-slate-500">
                {localize(locale, metric.label)}
              </p>
              <p className="mt-3 text-[clamp(2rem,2.6vw,2.6rem)] font-black leading-none tracking-[-0.04em] text-slate-950">
                {metric.value}
              </p>
              <p className="mt-2 cmm-text-small leading-relaxed text-slate-500">
                {localize(locale, metric.detail)}
              </p>
            </div>
          );
        })}
      </div>
    </header>
  );
}

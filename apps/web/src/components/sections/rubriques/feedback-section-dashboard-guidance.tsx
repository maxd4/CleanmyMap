import { ArrowRight } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import {
  FEEDBACK_STEPS,
  localize,
  type Locale,
} from "./feedback-section.shared";
import { FeedbackSectionDashboardSupport } from "./feedback-section-dashboard-support";

export function FeedbackSectionDashboardGuidance({
  locale,
  fr,
}: {
  locale: Locale;
  fr: boolean;
}) {
  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <aside
          id="collaboration"
          className="rounded-[2rem] border border-rose-200/70 bg-white/88 p-6 shadow-[0_24px_72px_-60px_rgba(236,72,153,0.55)] backdrop-blur-sm"
        >
          <h2 className="text-[0.9rem] font-black uppercase tracking-[0.18em] text-pink-600">
            {fr ? "Comment ça marche ?" : "How it works"}
          </h2>
          <p className="mt-2 text-[0.96rem] leading-[1.65] text-slate-600">
            {fr
              ? "Consultez notre centre d'aide ou contactez-nous."
              : "Check our help center or contact us."}
          </p>

          <div className="mt-5 space-y-4">
            {FEEDBACK_STEPS.map((step) => (
              <div key={step.index} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-lg font-black text-pink-600">
                  {step.index}
                </div>
                <div>
                  <p className="text-[0.95rem] font-bold leading-tight text-slate-950">
                    {localize(locale, step.title)}
                  </p>
                  <p className="mt-1 text-[0.96rem] leading-[1.65] text-slate-600">
                    {localize(locale, step.body)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <CmmButton
              href="/learn/comprendre"
              tone="secondary"
              variant="pill"
              className="h-12 w-full px-6 text-xs font-black uppercase tracking-[0.18em] text-pink-600"
            >
              {fr ? "En savoir plus" : "Learn more"}
              <ArrowRight size={16} />
            </CmmButton>
          </div>
        </aside>

        <div className="space-y-6">
          <FeedbackSectionDashboardSupport locale={locale} fr={fr} />
        </div>
      </section>
    </>
  );
}

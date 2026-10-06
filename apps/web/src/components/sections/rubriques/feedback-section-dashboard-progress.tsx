import { ArrowRight, Heart } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { Locale } from "./feedback-section.shared";
import type { FeedbackDashboardController } from "./use-feedback-dashboard-controller";
import { FeedbackSectionDashboardGuidance } from "./feedback-section-dashboard-guidance";
import { FeedbackSectionDashboardTracker } from "./feedback-section-dashboard-tracker";

type FeedbackDashboardProgressProps = Pick<
  FeedbackDashboardController,
  "statusFilter" | "setStatusFilter" | "visibleTrackerItems"
> & {
  locale: Locale;
  fr: boolean;
};

export function FeedbackSectionDashboardProgress({
  locale,
  fr,
  statusFilter,
  setStatusFilter,
  visibleTrackerItems,
}: FeedbackDashboardProgressProps) {
  return (
    <>
      <FeedbackSectionDashboardTracker
        locale={locale}
        fr={fr}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        visibleTrackerItems={visibleTrackerItems}
      />
      <FeedbackSectionDashboardGuidance locale={locale} fr={fr} />
      <section className="overflow-hidden rounded-[2.5rem] bg-[linear-gradient(135deg,#f42d74_0%,#d61f6b_48%,#c81d62_100%)] p-6 text-white shadow-[0_30px_100px_-54px_rgba(244,45,116,0.95)]">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/95 text-pink-500 shadow-2xl">
              <Heart size={34} />
            </div>
            <div className="max-w-2xl space-y-2">
              <h2 className="text-[1.2rem] font-black leading-tight tracking-[-0.03em] sm:text-[1.35rem]">
                {fr ? "Votre avis fait la différence" : "Your feedback makes a difference"}
              </h2>
              <p className="max-w-xl text-[0.96rem] leading-[1.7] text-white">
                {fr
                  ? "Ensemble, améliorons CleanMyMap pour un impact toujours plus fort et des données toujours plus fiables."
                  : "Together, let's improve CleanMyMap for stronger impact and more reliable data."}
              </p>
            </div>
          </div>

          <CmmButton
            href="/sections/community?tab=partners"
            tone="secondary"
            variant="pill"
            className="h-14 rounded-full bg-white px-6 text-xs font-black uppercase tracking-[0.18em] text-pink-600 shadow-2xl"
          >
            {fr ? "Devenir contributeur" : "Become a contributor"}
            <ArrowRight size={16} />
          </CmmButton>
        </div>
      </section>
    </>
  );
}

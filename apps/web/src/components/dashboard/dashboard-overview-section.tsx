import { ThirtySecondsSummary } from "@/components/pilotage/thirty-seconds-summary";
import { DashboardTodayPanel } from "@/components/dashboard/dashboard-today-panel";
import { buildDashboardTodayState, type DashboardRecommendedAction } from "@/lib/dashboard/today";
import type { PilotageOverview } from "@/lib/pilotage/overview";
import { isAdminLikeProfile, type AppProfile, type ProfileAction } from "@/lib/profiles";
import type { Locale } from "@/lib/ui/preferences";

type DashboardOverviewLoaded =
  | { status: "ok"; overview: PilotageOverview }
  | { status: "error"; message: string };

type DashboardOverviewSectionProps = {
  overviewPromise: Promise<DashboardOverviewLoaded>;
  locale: Locale;
  profile: AppProfile;
  primaryAction: ProfileAction;
};

function resolveRecommendedAction(params: {
  locale: Locale;
  profile: AppProfile;
  summaryAction: DashboardRecommendedAction;
  primaryAction: ProfileAction;
}): DashboardRecommendedAction {
  if (
    !isAdminLikeProfile(params.profile) &&
    params.summaryAction.href.startsWith("/admin")
  ) {
    return {
      href: params.primaryAction.href,
      label: params.primaryAction.label[params.locale],
      reason: params.primaryAction.description[params.locale],
    };
  }

  return params.summaryAction;
}

export async function DashboardOverviewSection({
  overviewPromise,
  locale,
  profile,
  primaryAction,
}: DashboardOverviewSectionProps) {
  const result = await overviewPromise;

  if (result.status === "error") {
    const errorState = buildDashboardTodayState({
      overview: null,
      locale,
      recommendedAction: {
        href: primaryAction.href,
        label: primaryAction.label[locale],
        reason: primaryAction.description[locale],
      },
      errorMessage: result.message,
    });

    return (
      <section data-gsap-reveal className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
        <div>
          <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] text-rose-700">
            Synthèse indisponible
          </p>
          <h2 className="mt-1 text-xl font-semibold text-rose-900">
            Le cockpit n&apos;a pas pu charger ses indicateurs
          </h2>
          <p className="mt-1 cmm-text-small text-rose-800">{result.message}</p>
        </div>
        <DashboardTodayPanel state={errorState} />
      </section>
    );
  }

  const overview = result.overview;
  const recommendedAction = resolveRecommendedAction({
    locale,
    profile,
    summaryAction: overview.summary.recommendedAction,
    primaryAction,
  });

  const todayState = buildDashboardTodayState({
    overview,
    locale,
    recommendedAction,
  });

  return (
    <div data-gsap-reveal className="space-y-4">
      <ThirtySecondsSummary
        kpis={overview.summary.kpis}
        alert={overview.summary.alert}
        recommendedAction={{
          href: recommendedAction.href,
          label: recommendedAction.label,
        }}
        recommendedReason={recommendedAction.reason}
      />
      <DashboardTodayPanel state={todayState} />
    </div>
  );
}

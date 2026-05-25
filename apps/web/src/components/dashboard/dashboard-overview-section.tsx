import { AlertTriangle } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import {
  SystemStateAction,
  SystemStateDescription,
  SystemStateIcon,
  SystemStateLayout,
  SystemStateMeta,
  SystemStateTitle,
} from "@/components/ui/system-state";
import { SystemStateRetryButton } from "@/components/ui/system-state-retry-button";
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
      <div data-gsap-reveal className="space-y-4">
        <SystemStateLayout variant="error" className="max-w-none">
          <SystemStateIcon variant="error">
            <AlertTriangle className="h-7 w-7" />
          </SystemStateIcon>
          <SystemStateMeta variant="error" label="Synthèse indisponible">
            Le cockpit n&apos;a pas pu charger ses indicateurs.
          </SystemStateMeta>
          <SystemStateTitle variant="error">Les données du tableau de bord sont indisponibles</SystemStateTitle>
          <SystemStateDescription variant="error">{result.message}</SystemStateDescription>
          <SystemStateAction>
            <SystemStateRetryButton label="Réessayer le chargement" />
            <CmmButton href="/actions/new" tone="secondary">
              Aller au formulaire
            </CmmButton>
          </SystemStateAction>
        </SystemStateLayout>
        <DashboardTodayPanel state={errorState} />
      </div>
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

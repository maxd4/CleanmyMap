import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { SystemStateRetryButton } from "@/components/ui/system-state-retry-button";
import type { DashboardTodayState } from "@/lib/dashboard/today";

type DashboardTodayPanelProps = {
  state: DashboardTodayState;
  locale?: "fr" | "en";
};

export function DashboardTodayPanel({ state, locale = "fr" }: DashboardTodayPanelProps) {
  const fr = locale === "fr";
  return (
    <section className="space-y-4">
      <div data-gsap-reveal className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold cmm-text-primary">{fr ? "Activité publiée et validation" : "Published activity and validation"}</h2>
        {"syncedAtLabel" in state && (
          <p className="text-sm cmm-text-secondary">{fr ? "Synthèse calculée le " : "Summary generated on "}{state.syncedAtLabel}</p>
        )}
      </div>
      {state.kind === "ready" ? (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {[state.latestActivity, state.validation].map((tile, index) => (
            <div key={tile.label} data-gsap-reveal>
              <CmmCard className="space-y-2">
                <h3 className="text-sm font-semibold cmm-text-secondary">
                  {index === 0
                    ? (fr ? "Dernière activité publiée disponible" : "Latest available published activity")
                    : (fr ? "Validation de la source" : "Source validation")}
                </h3>
                <p className="text-lg font-bold cmm-text-primary">{tile.title}</p>
                <p className="break-words text-sm cmm-text-secondary">{tile.detail}</p>
                <p className="text-sm cmm-text-secondary">{tile.meta}</p>
              </CmmCard>
            </div>
          ))}
        </div>
      ) : (
        <CmmCard className="space-y-3">
          <p className="cmm-text-secondary">{state.message}</p>
          <div className="flex flex-wrap gap-2">
            {state.kind === "error" && <SystemStateRetryButton />}
            <CmmButton href={state.nextAction.href} tone="secondary">{state.nextAction.title}</CmmButton>
          </div>
        </CmmCard>
      )}
    </section>
  );
}

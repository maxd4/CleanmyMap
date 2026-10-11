import { Check } from "lucide-react";
import { JoinActionTabs } from "@/components/sections/rubriques/rejoindre-une-action.tabs";
import {
  ACTION_CREATION_SECTIONS,
  ACTION_CREATION_SECTION_LABELS,
  ACTION_CREATION_SECTION_STATUS_LABELS,
  type ActionCreationSectionState,
} from "@/lib/actions/action-creation-sections";
import {
  ACTION_WORKFLOW_STEP_LABELS,
  ACTION_WORKFLOW_STATUS_LABELS,
  ACTION_WORKFLOW_STEPS,
  type ActionWorkflowState,
  type ActionWorkflowStepId,
} from "@/lib/actions/action-workflow";
import {
  buildActionCreationSpaceHref,
  buildActionCreationTabHref,
  type ActionCreationSpace,
  type ActionCreationTab,
} from "@/lib/actions/action-creation-routes";
import { cn } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

export function ActionLifecycleNavigation({
  actionId,
  activeSpace,
  searchParams,
  fr,
}: {
  actionId: string | null;
  activeSpace: ActionCreationSpace;
  searchParams?: SearchParams;
  fr: boolean;
}) {
  if (!actionId) {
    return (
      <JoinActionTabs
        activeTab="before"
        ariaLabel={fr ? "Onglets du parcours d’action" : "Action flow tabs"}
        idPrefix="action-creation-tab"
        tabs={[
          { id: "before", label: fr ? "Organiser" : "Organize", panelId: "action-creation-tabpanel-before" },
          { id: "after", label: fr ? "Déclarer une action réalisée" : "Report a completed action", panelId: "action-creation-tabpanel-after" },
        ]}
        buildHref={(tab) => buildActionCreationTabHref(tab as ActionCreationTab, searchParams)}
      />
    );
  }

  return (
    <JoinActionTabs
      activeTab={activeSpace}
      ariaLabel={fr ? "Espaces de l’action" : "Action spaces"}
      idPrefix="action-creation-space"
      tabs={[
        { id: "prepare", label: fr ? "Préparer" : "Prepare", panelId: "action-creation-panel-prepare" },
        { id: "day", label: fr ? "Jour J" : "Action day", panelId: "action-creation-panel-day" },
        { id: "bilan", label: fr ? "Bilan" : "Review", panelId: "action-creation-panel-bilan" },
      ]}
      buildHref={(space) => buildActionCreationSpaceHref(space as ActionCreationSpace, { ...(searchParams ?? {}), actionId })}
    />
  );
}
export function ActionCreationSectionNavigation({
  state,
  fr,
  onSelect,
}: {
  state: ActionCreationSectionState;
  fr: boolean;
  onSelect: (section: ActionCreationSectionState["activeSection"]) => void;
}) {
  return (
    <nav aria-label={fr ? "Sections de l’action" : "Action sections"} data-testid="action-creation-section-nav">
      <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {ACTION_CREATION_SECTIONS.map((section, index) => {
          const labels = ACTION_CREATION_SECTION_LABELS[section];
          const status = state.statuses[section];
          const statusLabel = ACTION_CREATION_SECTION_STATUS_LABELS[status][fr ? "fr" : "en"];
          const active = state.activeSection === section;
          return (
            <li key={section}>
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                aria-describedby={`action-creation-section-description-${section}`}
                onClick={() => onSelect(section)}
                className={cn(
                  "flex min-h-16 w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                  active ? "border-emerald-500 bg-emerald-50" : "border-emerald-100 bg-white/85 hover:border-emerald-300 hover:bg-emerald-50/60",
                )}
              >
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-black", status === "done" ? "border-emerald-500 bg-emerald-500 text-white" : "border-emerald-300 text-emerald-800")}>
                  {status === "done" ? <Check size={15} aria-hidden="true" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-emerald-950">{labels[fr ? "fr" : "en"]}</span>
                  <span className="mt-0.5 block text-xs font-semibold text-emerald-900/70">{statusLabel}</span>
                  <span id={`action-creation-section-description-${section}`} className="mt-1 block text-xs leading-5 text-emerald-900/60">{labels.description[fr ? "fr" : "en"]}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
export function WorkflowStepper({
  state,
  onSelect,
  fr = true,
}: {
  state: ActionWorkflowState;
  onSelect: (step: ActionWorkflowStepId) => void;
  fr?: boolean;
}) {
  return (
    <nav aria-label={fr ? "Étapes de préparation de l’action" : "Action preparation steps"} data-testid="action-workflow-stepper">
      <ol className="grid gap-2 sm:grid-cols-4">
        {ACTION_WORKFLOW_STEPS.map((step, index) => {
          const status = state.statuses[step];
          const labels = ACTION_WORKFLOW_STEP_LABELS[step];
          const statusLabel = ACTION_WORKFLOW_STATUS_LABELS[status][fr ? "fr" : "en"];
          const active = state.activeStep === step;
          return (
            <li key={step}>
              <button type="button" aria-current={active ? "step" : undefined} aria-label={`${index + 1}. ${labels[fr ? "fr" : "en"]} — ${statusLabel}`} onClick={() => onSelect(step)} className={cn("flex min-h-16 w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500", active ? "border-emerald-500 bg-emerald-50" : "border-emerald-100 bg-white/80")}>
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-black", status === "done" ? "border-emerald-500 bg-emerald-500 text-white" : "border-emerald-300 text-emerald-800")}>
                  {status === "done" ? <Check size={16} aria-hidden="true" /> : index + 1}
                </span>
                <span className="min-w-0"><span className="block text-sm font-black text-emerald-950">{labels[fr ? "fr" : "en"]}</span><span className="block text-xs text-emerald-900/65">{statusLabel}</span></span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

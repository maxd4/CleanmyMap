"use client";

import { useCallback, useState, type ComponentProps, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ClipboardList,
  FileWarning,
  Navigation,
  CloudSun,
  type LucideIcon,
} from "lucide-react";
import { ActionBeforeDeclarationForm } from "./action-declaration/before/form";
import { ActionDeclarationForm } from "./action-declaration/form/action-declaration-form";
import { ActionCreationLegalPanel } from "./action-creation-legal-panel";
import { RouteSection } from "@/components/sections/rubriques/route";
import { WeatherSection } from "@/components/sections/rubriques/weather-section";
import { CmmCard } from "@/components/ui/cmm-card";
import { EffectiveAuthStateProvider } from "@/lib/auth/use-effective-auth-state";
import {
  INACTIVE_LOCAL_DEV_AUTH,
  type LocalDevAuthState,
} from "@/lib/auth/effective-auth-contract";
import { cn } from "@/lib/utils";
import {
  buildActionCreationTabHref,
  type ActionCreationPanelId,
  type ActionCreationTab,
} from "@/lib/actions/action-creation-routes";
import { updateAction } from "@/lib/actions/http";
import type { FormState } from "./action-declaration/form/model";
import { JoinActionTabs } from "@/components/sections/rubriques/rejoindre-une-action.tabs";

type ActionCreationShellProps = Omit<
  ComponentProps<typeof ActionBeforeDeclarationForm>,
  "onPassToComplete" | "onFormChange" | "onActionPersisted"
> & {
  initialPanel: ActionCreationPanelId;
  initialTab?: ActionCreationTab;
  tabSearchParams?: Record<string, string | string[] | undefined>;
  localDevAuth?: LocalDevAuthState;
};

type ActionCreationPanel = {
  id: ActionCreationPanelId;
  label: string;
  description: string;
  icon: LucideIcon;
  content: ReactNode;
};

function ActionCreationPanelView({
  panel,
  open,
  onToggle,
}: {
  panel: ActionCreationPanel;
  open: boolean;
  onToggle: () => void;
}) {
  const Icon = panel.icon;

  return (
    <section
      id={`action-creation-panel-${panel.id}`}
      className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-white/95 shadow-[0_22px_60px_-36px_rgba(16,185,129,0.45)]"
    >
      <h2>
        <button
          type="button"
          aria-controls={`action-creation-panel-${panel.id}-content`}
          aria-expanded={open}
          onClick={onToggle}
          className="flex min-h-16 w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors motion-reduce:transition-none hover:bg-emerald-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset md:px-7 md:py-5"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-200/80 bg-emerald-50 text-emerald-700">
              <Icon size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-bold text-emerald-950 md:text-lg">
                {panel.label}
              </span>
              <span className="mt-1 block text-xs leading-5 text-emerald-900/65 md:text-sm">
                {panel.description}
              </span>
            </span>
          </span>
          <ChevronDown
            size={20}
            aria-hidden="true"
            className={cn(
              "shrink-0 text-emerald-700 transition-transform motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </button>
      </h2>
      <div
        id={`action-creation-panel-${panel.id}-content`}
        hidden={!open}
        className="border-t border-emerald-100/80"
      >
        {panel.content}
      </div>
    </section>
  );
}

export function ActionCreationShell({
  initialPanel,
  initialTab = "before",
  tabSearchParams,
  localDevAuth = INACTIVE_LOCAL_DEV_AUTH,
  ...formProps
}: ActionCreationShellProps) {
  const router = useRouter();
  const [draftContext, setDraftContext] = useState<{
    locationLabel?: string;
    actionDate?: string;
  }>({});
  const [currentActionId, setCurrentActionId] = useState<string | null>(
    formProps.initialActionId ?? null,
  );
  const [openPanels, setOpenPanels] = useState<Record<ActionCreationPanelId, boolean>>(() => ({
    "pre-formulaire": initialPanel === "pre-formulaire",
    itineraire: initialPanel === "itineraire",
    meteo: initialPanel === "meteo",
    formalites: initialPanel === "formalites",
  }));
  const [mountedPanels, setMountedPanels] = useState<ReadonlySet<ActionCreationPanelId>>(
    () => new Set([initialPanel]),
  );
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const togglePanel = (panel: ActionCreationPanelId) => {
    if (!openPanels[panel]) {
      setMountedPanels((current) => {
        if (current.has(panel)) return current;
        return new Set([...current, panel]);
      });
    }
    setOpenPanels((current) => ({ ...current, [panel]: !current[panel] }));
  };
  const handleBeforeFormChange = useCallback((form: FormState) => {
    setDraftContext({
      locationLabel:
        form.departureLocationLabel.trim() || form.locationLabel.trim(),
      actionDate: form.actionDate.trim(),
    });
  }, []);
  const handleBeforeActionPersisted = useCallback((actionId: string) => {
    setCurrentActionId(actionId);
  }, []);
  const handlePassToComplete = useCallback(
    async (actionId: string) => {
      setTransitionError(null);
      try {
        await updateAction(actionId, { actionPhase: "post_action_draft" });
        const nextParams = { ...(tabSearchParams ?? {}), actionId };
        router.replace(buildActionCreationTabHref("after", nextParams));
      } catch (error: unknown) {
        setTransitionError(
          error instanceof Error && error.message
            ? error.message
            : "Impossible d’ouvrir le formulaire complet pour le moment.",
        );
      }
    },
    [router, tabSearchParams],
  );
  const actionCreationSearchParams = currentActionId
    ? { ...(tabSearchParams ?? {}), actionId: currentActionId }
    : tabSearchParams;

  const panels: ActionCreationPanel[] = [
    {
      id: "pre-formulaire",
      label: initialTab === "before" ? "Pré-formulaire" : "Formulaire",
      description: "Créer une pré-action autonome et la publier explicitement si nécessaire.",
      icon: ClipboardList,
      content: mountedPanels.has("pre-formulaire") ? (
        initialTab === "before" ? (
          <ActionBeforeDeclarationForm
            {...formProps}
            initialActionId={formProps.initialActionId ?? null}
            onFormChange={handleBeforeFormChange}
            onActionPersisted={handleBeforeActionPersisted}
            onPassToComplete={handlePassToComplete}
          />
        ) : (
          <ActionDeclarationForm
            {...formProps}
            initialActionId={formProps.initialActionId ?? null}
          />
        )
      ) : null,
    },
    {
      id: "itineraire",
      label: "Itinéraire",
      description: "Calculer une recommandation puis enrichir le même draft d’action.",
      icon: Navigation,
      content: mountedPanels.has("itineraire") ? (
        <EffectiveAuthStateProvider localDevAuth={localDevAuth}>
          <RouteSection actionId={currentActionId} />
        </EffectiveAuthStateProvider>
      ) : null,
    },
    {
      id: "meteo",
      label: "Météo & conditions terrain",
      description: "Consulter la météo et préparer le terrain, avec ou sans pré-formulaire.",
      icon: CloudSun,
      content: mountedPanels.has("meteo") ? <WeatherSection draftContext={draftContext} /> : null,
    },
    {
      id: "formalites",
      label: "Formalités juridiques",
      description: "Repérer ce qui reste à documenter depuis une source officielle.",
      icon: FileWarning,
      content: mountedPanels.has("formalites") ? (
        <ActionCreationLegalPanel actionId={currentActionId} />
      ) : null,
    },
  ];

  return (
    <div
      data-testid="action-creation-shell"
      data-open-panel={initialPanel}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#ECF8EF] via-white to-[#F7FCF8] px-3 py-4 md:px-5 md:py-6"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-200/45 blur-[110px]" />
        <div className="absolute right-0 top-8 h-80 w-80 rounded-full bg-emerald-100/50 blur-[120px]" />
      </div>
      <div className="cmm-page-width relative space-y-4">
        <CmmCard tone="emerald" variant="glass" size="lg">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-emerald-700">Agir</p>
            <h1 className="text-[clamp(2rem,4vw,3.4rem)] font-black tracking-tight text-emerald-950">
              Créer une action
            </h1>
            <p className="cmm-text-body cmm-text-primary max-w-3xl">
              Préparer une action avant terrain ou compléter ses résultats après réalisation.
              Chaque panneau est indépendant : aucun parcours guidé n&apos;est imposé.
            </p>
          </div>
        </CmmCard>

        <JoinActionTabs
          activeTab={initialTab}
          ariaLabel="Onglets du parcours d'action"
          idPrefix="action-creation-tab"
          tabs={[
            { id: "before", label: "Pré-formulaire", panelId: "action-creation-tabpanel-before" },
            { id: "after", label: "Formulaire", panelId: "action-creation-tabpanel-after" },
          ]}
          buildHref={(tab) =>
            buildActionCreationTabHref(tab as ActionCreationTab, actionCreationSearchParams)
          }
        />

        {transitionError ? (
          <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {transitionError}
          </p>
        ) : null}

        <div className="space-y-4" data-testid="action-creation-panels">
          {panels.map((panel) => {
            const panelView = (
              <ActionCreationPanelView
                key={panel.id}
                panel={panel}
                open={openPanels[panel.id]}
                onToggle={() => togglePanel(panel.id)}
              />
            );

            if (panel.id !== "pre-formulaire") return panelView;

            return (
              <div
                key={panel.id}
                id={`action-creation-tabpanel-${initialTab}`}
                role="tabpanel"
                aria-labelledby={`action-creation-tab-${initialTab}`}
                tabIndex={-1}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-4"
              >
                {panelView}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useState, type ComponentProps, type ReactNode } from "react";
import {
  ChevronDown,
  ClipboardList,
  FileWarning,
  Navigation,
  CloudSun,
  type LucideIcon,
} from "lucide-react";
import { ActionDeclarationEntryFlow } from "./action-declaration-entry-flow";
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
import type { ActionCreationPanelId } from "@/lib/actions/action-creation-routes";
import type { FormState } from "./action-declaration/form/model";

type ActionCreationShellProps = ComponentProps<typeof ActionDeclarationEntryFlow> & {
  initialPanel: ActionCreationPanelId;
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
      className="overflow-hidden rounded-[2.25rem] border border-emerald-200/80 bg-white/90 shadow-[0_22px_60px_-36px_rgba(16,185,129,0.45)]"
    >
      <h2>
        <button
          type="button"
          aria-controls={`action-creation-panel-${panel.id}-content`}
          aria-expanded={open}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-emerald-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset md:px-7 md:py-5"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-200/80 bg-emerald-50 text-emerald-700">
              <Icon size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-black tracking-tight text-emerald-950 md:text-lg">
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
              "shrink-0 text-emerald-700 transition-transform",
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
  localDevAuth = INACTIVE_LOCAL_DEV_AUTH,
  ...flowProps
}: ActionCreationShellProps) {
  const [draftContext, setDraftContext] = useState<{
    locationLabel?: string;
    actionDate?: string;
  }>({});
  const [currentActionId, setCurrentActionId] = useState<string | null>(
    flowProps.initialActionId ?? null,
  );
  const [openPanels, setOpenPanels] = useState<Record<ActionCreationPanelId, boolean>>(() => ({
    "pre-formulaire": initialPanel === "pre-formulaire",
    itineraire: initialPanel === "itineraire",
    meteo: initialPanel === "meteo",
    formalites: initialPanel === "formalites",
  }));

  const togglePanel = (panel: ActionCreationPanelId) => {
    setOpenPanels((current) => ({ ...current, [panel]: !current[panel] }));
  };
  const initialEntryPath =
    flowProps.initialEntryPath ?? (flowProps.initialActionId ? undefined : "before");
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

  const panels: ActionCreationPanel[] = [
    {
      id: "pre-formulaire",
      label: "Pré-formulaire",
      description: "Créer une pré-action autonome et la publier explicitement si nécessaire.",
      icon: ClipboardList,
      content: (
        <ActionDeclarationEntryFlow
          {...flowProps}
          initialEntryPath={initialEntryPath}
          onBeforeFormChange={handleBeforeFormChange}
          onBeforeActionPersisted={handleBeforeActionPersisted}
        />
      ),
    },
    {
      id: "itineraire",
      label: "Itinéraire",
      description: "Calculer une recommandation puis enrichir le même draft d’action.",
      icon: Navigation,
      content: (
        <EffectiveAuthStateProvider localDevAuth={localDevAuth}>
          <RouteSection />
        </EffectiveAuthStateProvider>
      ),
    },
    {
      id: "meteo",
      label: "Météo & conditions terrain",
      description: "Consulter la météo et préparer le terrain, avec ou sans pré-formulaire.",
      icon: CloudSun,
      content: <WeatherSection draftContext={draftContext} />,
    },
    {
      id: "formalites",
      label: "Formalités juridiques",
      description: "Repérer ce qui reste à documenter depuis une source officielle.",
      icon: FileWarning,
          content: (
            <ActionCreationLegalPanel actionId={currentActionId} />
          ),
    },
  ];

  return (
    <div
      data-testid="action-creation-shell"
      data-open-panel={initialPanel}
      className="relative overflow-hidden rounded-[2.75rem] bg-gradient-to-b from-[#ECF8EF] via-white to-[#F7FCF8] px-3 py-4 md:px-5 md:py-6"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-200/45 blur-[110px]" />
        <div className="absolute right-0 top-8 h-80 w-80 rounded-full bg-emerald-100/50 blur-[120px]" />
      </div>
      <div className="relative mx-auto w-full max-w-7xl space-y-4">
        <CmmCard tone="emerald" variant="glass" size="lg">
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Agir</p>
            <h1 className="text-[clamp(2rem,4vw,3.4rem)] font-black tracking-tighter text-emerald-950">
              Créer une action
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-emerald-900/72 md:text-base">
              Préparer une action avant terrain ou compléter ses résultats après réalisation.
              Chaque panneau est indépendant : aucun parcours guidé n&apos;est imposé.
            </p>
          </div>
        </CmmCard>

        <div className="space-y-4" data-testid="action-creation-panels">
          {panels.map((panel) => (
            <ActionCreationPanelView
              key={panel.id}
              panel={panel}
              open={openPanels[panel.id]}
              onToggle={() => togglePanel(panel.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

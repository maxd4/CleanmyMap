import { ArrowLeft, ArrowRight, CheckCircle2, CloudSun, ClipboardList, Map, Navigation, Users } from "lucide-react";
import type { ReactNode } from "react";
import { RouteSection } from "@/components/sections/rubriques/route";
import { WeatherSection } from "@/components/sections/rubriques/weather-section";
import { EffectiveAuthStateProvider } from "@/lib/auth/use-effective-auth-state";
import { ACTION_CREATION_SECTIONS, ACTION_CREATION_SECTION_LABELS, type ActionCreationSectionState } from "@/lib/actions/action-creation-sections";
import type { ActionCreationPanelId, ActionCreationSectionId, ActionCreationSpace, ActionCreationSubsectionId } from "@/lib/actions/action-creation-routes";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { isRouteInterventionMode } from "@/lib/actions/intervention-mode";
import { ActionLifecycleNavigation, ActionCreationSectionNavigation } from "./action-creation-shell-navigation";
import { ActionBeforeDeclarationForm } from "./action-declaration/before/form";
import { PageHeader } from "@/components/ui/page-header";
import type { ActionCreationSharedViewProps } from "./action-creation-shell.types";
import type { FormState } from "./action-declaration/model";

function ActionCreationContextPreview({
  fr,
  actionId,
  form,
  activeSection,
}: {
  fr: boolean;
  actionId: string | null;
  form: Partial<FormState>;
  activeSection: ActionCreationSectionId;
}) {
  const valueOrFallback = (value: string | undefined, fallback: string) => value?.trim() || fallback;
  return (
    <aside className="space-y-4" aria-label={fr ? "Aperçu contextuel de l’action" : "Action context preview"} data-testid="action-creation-context-preview">
      <CmmCard tone="emerald" variant="outlined" size="md">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">{fr ? "Aperçu" : "Preview"}</p><h2 className="mt-1 text-lg font-black text-emerald-950">{valueOrFallback(form.actionTitle, fr ? "Votre action" : "Your action")}</h2></div><Map size={20} className="text-emerald-600" aria-hidden="true" /></div>
          <dl className="space-y-3 text-sm">
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{fr ? "Objectif" : "Objective"}</dt><dd className="mt-1 text-emerald-950">{valueOrFallback(form.shortDescription, fr ? "À préciser" : "To specify")}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{fr ? "Lieu" : "Place"}</dt><dd className="mt-1 text-emerald-950">{valueOrFallback(form.departureLocationLabel || form.locationLabel, fr ? "À préciser" : "To specify")}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Date</dt><dd className="mt-1 text-emerald-950">{valueOrFallback(form.actionDate, fr ? "À préciser" : "To specify")}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{fr ? "Organisateur" : "Organizer"}</dt><dd className="mt-1 text-emerald-950">{valueOrFallback(form.organizerName, fr ? "À préciser" : "To specify")}</dd></div>
          </dl>
          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-900/75"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" /><span>{fr ? `Section active : ${ACTION_CREATION_SECTION_LABELS[activeSection].fr}. Les modifications restent sur la même action.` : `Active section: ${ACTION_CREATION_SECTION_LABELS[activeSection].en}. Changes stay on the same action.`}</span></div>
          {actionId ? <p className="text-xs font-mono text-emerald-900/55">{fr ? "Référence" : "Reference"}: {actionId}</p> : null}
        </div>
      </CmmCard>
      <CmmCard tone="emerald" variant="muted" size="sm"><div className="flex items-start gap-2 text-sm text-emerald-900/75"><Users size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" /><p>{fr ? "Vous pouvez changer de section à tout moment. Une section incomplète reste à compléter." : "You can change sections at any time. An incomplete section remains to be completed."}</p></div></CmmCard>
    </aside>
  );
}
export function ActionCreationSectionContent({
  activeSection,
  initialSubsection,
  formSnapshot,
  initialPanel,
  ...viewProps
}: ActionCreationSharedViewProps & {
  activeSection: ActionCreationSectionId;
  initialSubsection?: ActionCreationSubsectionId;
  formSnapshot: Partial<FormState>;
  initialPanel: ActionCreationPanelId;
}) {
  const { currentActionId, formProps, preparationContext, formalitiesReadiness, localDevAuth, draftContext, preparationPersistenceStatus, onFormChange, onActionPersisted, onFormalitiesReadiness, onPassToComplete, onPreparationValidated, onPreparationSelection, onPreparationContextChange } = viewProps;
  return (
    <div className="space-y-4">
      <ActionBeforeDeclarationForm
        {...formProps}
        initialActionId={currentActionId}
        activeSection={activeSection}
        preparationContext={preparationContext}
        guidedWorkflow
        guidedReadiness={formalitiesReadiness}
        onFormChange={onFormChange}
        onActionPersisted={onActionPersisted}
        onFormalitiesReadiness={onFormalitiesReadiness}
        onPassToComplete={onPassToComplete}
      />
      {activeSection === "terrain" ? (
        <div data-active-subsection={initialSubsection ?? "terrain"}>
          <div className="grid gap-4 xl:grid-cols-2">
            <CmmCard tone="emerald" variant="glass" size="lg">
              <div className="space-y-3">
                <div className="flex items-center gap-2"><Navigation size={18} className="text-emerald-700" aria-hidden="true" /><h3 className="text-lg font-black text-emerald-950">Carte et itinéraire</h3></div>
                <p className="cmm-text-body cmm-text-primary">L’itinéraire reste optionnel et réutilise le planificateur existant.</p>
                {(() => {
                  const selectedMode = formSnapshot.interventionMode?.mode ?? (initialPanel === "itineraire" || initialSubsection === "route" ? "itinerary" : "fixed_area");
                  return isRouteInterventionMode(selectedMode)
                    ? <EffectiveAuthStateProvider localDevAuth={localDevAuth}><RouteSection actionId={currentActionId} /></EffectiveAuthStateProvider>
                    : <p data-testid="fixed-area-route-state" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950">Mode zone fixe actif : la carte et le rendez-vous suffisent. Le planificateur d’itinéraire reste fermé.</p>;
                })()}
              </div>
            </CmmCard>
            <CmmCard tone="emerald" variant="glass" size="lg">
              <div className="space-y-3">
                <div className="flex items-center gap-2"><CloudSun size={18} className="text-emerald-700" aria-hidden="true" /><h3 className="text-lg font-black text-emerald-950">Météo et créneau</h3></div>
                <p className="cmm-text-body cmm-text-primary">Les prévisions restent consultatives et ne modifient l’action qu’après un choix explicite.</p>
                <WeatherSection draftContext={draftContext} preparationContext={preparationContext} preparationPersistenceStatus={preparationPersistenceStatus} onPreparationSelection={onPreparationSelection} onPreparationValidated={onPreparationValidated} onPreparationContextChange={onPreparationContextChange} />
              </div>
            </CmmCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
export function ActionCreationSectionsView({
  state,
  fr,
  content,
  formSnapshot,
  currentActionId,
  activeSpace,
  transitionError,
  actionCreationSearchParams,
  onSelect,
  onNext,
  onPrevious,
}: {
  state: ActionCreationSectionState;
  fr: boolean;
  content: ReactNode;
  formSnapshot: Partial<FormState>;
  currentActionId: string | null;
  activeSpace: ActionCreationSpace;
  transitionError: string | null;
  actionCreationSearchParams?: Record<string, string | string[] | undefined>;
  onSelect: (section: ActionCreationSectionId) => void;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const activeSection = state.activeSection;
  const index = ACTION_CREATION_SECTIONS.indexOf(activeSection);
  const labels = ACTION_CREATION_SECTION_LABELS[activeSection];
  const icon = activeSection === "terrain" ? <Map size={18} /> : activeSection === "equipe" ? <Users size={18} /> : activeSection === "verification" ? <CheckCircle2 size={18} /> : <ClipboardList size={18} />;
  return (
    <div data-testid="action-creation-shell" data-workflow-section={activeSection} className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#ECF8EF] via-white to-[#F7FCF8] px-3 py-4 md:px-5 md:py-6">
      <div className="pointer-events-none absolute inset-0 exhaustive-only"><div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-200/45 blur-[110px]" /><div className="absolute right-0 top-8 h-80 w-80 rounded-full bg-emerald-100/50 blur-[120px]" /></div>
      <div className="cmm-page-width relative space-y-5">
        <CmmCard tone="emerald" variant="glass" size="sm"><PageHeader tone="emerald" title={fr ? "Organiser une action" : "Organize an action"} subtitle={fr ? "Préparez la même action, section par section, puis vérifiez-la avant publication." : "Prepare the same action section by section, then review it before publication."} className="!gap-2" /></CmmCard>
        <ActionLifecycleNavigation actionId={currentActionId} activeSpace={activeSpace} fr={fr} searchParams={actionCreationSearchParams} />
        <ActionCreationSectionNavigation state={state} fr={fr} onSelect={onSelect} />
        {transitionError ? <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{transitionError}</p> : null}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <main aria-labelledby={`action-creation-section-${activeSection}`} className="min-w-0 space-y-4">
            <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700" aria-hidden="true">{icon}</span><div><h2 id={`action-creation-section-${activeSection}`} className="text-xl font-black text-emerald-950">{labels[fr ? "fr" : "en"]}</h2><p className="cmm-text-body cmm-text-primary mt-1">{labels.description[fr ? "fr" : "en"]}</p></div></div>
            {content}
            <div className="flex flex-wrap justify-between gap-3 rounded-2xl border border-emerald-100 bg-white/85 p-3"><CmmButton type="button" tone="tertiary" variant="pill" size="sm" disabled={index === 0} onClick={onPrevious}><ArrowLeft size={14} />{fr ? "Section précédente" : "Previous section"}</CmmButton>{index < ACTION_CREATION_SECTIONS.length - 1 ? <CmmButton type="button" tone="primary" variant="pill" size="sm" onClick={onNext}>{fr ? "Section suivante" : "Next section"}<ArrowRight size={14} /></CmmButton> : null}</div>
          </main>
          <ActionCreationContextPreview fr={fr} actionId={currentActionId} form={formSnapshot} activeSection={activeSection} />
        </div>
      </div>
    </div>
  );
}

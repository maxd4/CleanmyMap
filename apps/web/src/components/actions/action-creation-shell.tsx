"use client";

import { ActionDayView } from "./action-day-view";
import { ActionBilanView, AfterActionCreationView } from "./action-creation-shell-completion";
import { ActionLifecycleNavigation } from "./action-creation-shell-navigation";
import { ActionCreationSectionContent, ActionCreationSectionsView } from "./action-creation-shell-sections";
import { ActionWorkflowStepContent, GuidedActionWorkflowView } from "./action-creation-shell-workflow";
import type { ActionCreationSectionFormProps, ActionCreationShellProps } from "./action-creation-shell.types";
import { useActionCreationShellController } from "./use-action-creation-shell-controller";
import { CmmCard } from "@/components/ui/cmm-card";
import { PageHeader } from "@/components/ui/page-header";
import { INACTIVE_LOCAL_DEV_AUTH } from "@/lib/auth/effective-auth-contract";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

export function ActionCreationShell({
  initialPanel,
  initialSection = "essentiel",
  initialSubsection,
  initialTab = "before",
  initialSpace = "prepare",
  tabSearchParams,
  localDevAuth = INACTIVE_LOCAL_DEV_AUTH,
  sectionsEnabled = true,
  ...formProps
}: ActionCreationShellProps) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const initialActionId = formProps.initialActionId ?? null;
  const controller = useActionCreationShellController({
    initialActionId,
    initialPanel,
    initialSection,
    initialSpace,
    tabSearchParams,
    defaultActorName: formProps.defaultActorName,
    sectionsEnabled,
  });
  return <ActionCreationShellView controller={controller} fr={fr} formProps={formProps} initialPanel={initialPanel} initialSubsection={initialSubsection} initialTab={initialTab} initialSpace={initialSpace} localDevAuth={localDevAuth} sectionsEnabled={sectionsEnabled} />;
}
type ActionCreationShellController = ReturnType<typeof useActionCreationShellController>;

function ActionCreationShellView({
  controller,
  fr,
  formProps,
  initialPanel,
  initialSubsection,
  initialTab,
  initialSpace,
  localDevAuth,
  sectionsEnabled,
}: {
  controller: ActionCreationShellController;
  fr: boolean;
  formProps: ActionCreationSectionFormProps;
  initialPanel: ActionCreationShellProps["initialPanel"];
  initialSubsection?: ActionCreationShellProps["initialSubsection"];
  initialTab: NonNullable<ActionCreationShellProps["initialTab"]>;
  initialSpace: NonNullable<ActionCreationShellProps["initialSpace"]>;
  localDevAuth: NonNullable<ActionCreationShellProps["localDevAuth"]>;
  sectionsEnabled: boolean;
}) {
  const {
    actionCreationSearchParams,
    actionIdForRender,
    activeStep,
    currentActionId,
    formSnapshot,
    formalitiesReadiness,
    handleBeforeActionPersisted,
    handleBeforeFormChange,
    handleFormalitiesReadiness,
    handleNextSection,
    handleNextStep,
    handlePassToComplete,
    handlePreparationContextChange,
    handlePreparationSelection,
    handlePreparationValidated,
    handlePreviousSection,
    handleSectionFormChange,
    navigateToSection,
    navigateToStep,
    preparationContext,
    preparationContextReady,
    preparationPersistenceStatus,
    renderedSectionState,
    renderedWorkflow,
    transitionError,
  } = controller;
  const sharedViewProps = {
    currentActionId,
    draftContext: {
      locationLabel: preparationContext.locationLabel,
      actionDate: preparationContext.actionDate,
      departureTime: preparationContext.departureTime,
      contextReady: preparationContextReady,
    },
    preparationContext,
    formalitiesReadiness,
    formProps,
    localDevAuth,
    preparationPersistenceStatus,
    onActionPersisted: handleBeforeActionPersisted,
    onFormChange: handleSectionFormChange,
    onFormalitiesReadiness: handleFormalitiesReadiness,
    onPassToComplete: handlePassToComplete,
    onPreparationValidated: handlePreparationValidated,
    onPreparationSelection: handlePreparationSelection,
    onPreparationContextChange: handlePreparationContextChange,
  };

  if (initialSpace === "day" && actionIdForRender) {
    return <div data-testid="action-day-shell" className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#ECF8EF] via-white to-[#F7FCF8] px-3 py-4 md:px-5 md:py-6"><div className="cmm-page-width space-y-4"><CmmCard tone="emerald" variant="glass" size="lg"><PageHeader tone="emerald" title="Jour J" subtitle="Retrouvez le rendez-vous et le briefing de la même action." className="!gap-2" /></CmmCard><ActionLifecycleNavigation actionId={actionIdForRender} activeSpace="day" fr={fr} searchParams={actionCreationSearchParams} /><ActionDayView actionId={actionIdForRender} /></div></div>;
  }
  if (initialSpace === "bilan" && actionIdForRender) return <ActionBilanView formProps={formProps} actionId={actionIdForRender} searchParams={actionCreationSearchParams} fr={fr} />;
  if (initialTab === "after") return <AfterActionCreationView formProps={formProps} actionId={actionIdForRender} searchParams={actionCreationSearchParams} fr={fr} />;
  if (sectionsEnabled) {
    return <ActionCreationSectionsView state={renderedSectionState} fr={fr} activeSpace={initialSpace} formSnapshot={formSnapshot} currentActionId={actionIdForRender} transitionError={transitionError} actionCreationSearchParams={actionCreationSearchParams} onSelect={navigateToSection} onPrevious={handlePreviousSection} onNext={handleNextSection} content={<ActionCreationSectionContent {...sharedViewProps} activeSection={renderedSectionState.activeSection} initialSubsection={initialSubsection} initialPanel={initialPanel} formSnapshot={formSnapshot} />} />;
  }
  return <GuidedActionWorkflowView state={renderedWorkflow} fr={fr} currentActionId={actionIdForRender} activeSpace={initialSpace} stepContent={<ActionWorkflowStepContent {...sharedViewProps} onFormChange={handleBeforeFormChange} activeStep={activeStep} />} transitionError={transitionError} actionCreationSearchParams={actionCreationSearchParams} onSelect={navigateToStep} onNext={handleNextStep} />;
}

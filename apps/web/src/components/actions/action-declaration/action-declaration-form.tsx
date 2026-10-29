"use client";

import {
  ActionDeclarationFormOverlays,
  ActionDeclarationFormStatus,
  ActionDeclarationFormSurface,
} from "./action-declaration-form-content";
import { useActionDeclarationForm } from "./hooks/use-action-declaration-form";
import { useActionDeclarationFormViewModel } from "./hooks/use-action-declaration-form-view-model";
import type { ActionDeclarationFormProps } from "./action-declaration-form.types";
import { ActionPollutionScoreReferencesProvider } from "../map/scores/action-pollution-score-references-context";

export function ActionDeclarationForm(props: ActionDeclarationFormProps) {
  return (
    <ActionPollutionScoreReferencesProvider>
      <ActionDeclarationFormBody {...props} />
    </ActionPollutionScoreReferencesProvider>
  );
}

function ActionDeclarationFormBody(props: ActionDeclarationFormProps) {
  const state = useActionDeclarationForm(props);
  const viewModel = useActionDeclarationFormViewModel(props, state);

  if (viewModel.isHydratingAction) return <ActionDeclarationFormStatus error={null} />;
  if (viewModel.hydrationError) return <ActionDeclarationFormStatus error={viewModel.hydrationError} />;

  return (
    <>
      <ActionDeclarationFormOverlays {...viewModel.overlays} />
      <ActionDeclarationFormSurface {...viewModel.surface} />
    </>
  );
}

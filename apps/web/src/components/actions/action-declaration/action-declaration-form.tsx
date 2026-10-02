"use client";

import {
  ActionDeclarationFormOverlays,
  ActionDeclarationFormStatus,
  ActionDeclarationFormSurface,
} from "./action-declaration-form-content";
import { useActionDeclarationForm } from "./hooks/use-action-declaration-form";
import { useActionDeclarationFormViewModel } from "./hooks/use-action-declaration-form-view-model";
import type { ActionDeclarationFormProps } from "./action-declaration-form.types";

export type { ActionDeclarationFormProps } from "./action-declaration-form.types";

export function ActionDeclarationForm(props: ActionDeclarationFormProps) {
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

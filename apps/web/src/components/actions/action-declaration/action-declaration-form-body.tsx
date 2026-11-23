"use client";

import { useEffect } from "react";
import {
  ActionDeclarationFormOverlays,
  ActionDeclarationFormStatus,
  ActionDeclarationFormSurface,
} from "./action-declaration-form-content";
import { useActionDeclarationForm } from "./hooks/use-action-declaration-form";
import { useActionDeclarationFormViewModel } from "./hooks/use-action-declaration-form-view-model";
import type { ActionDeclarationFormProps } from "./action-declaration-form.types";

export function ActionDeclarationFormBody(props: ActionDeclarationFormProps) {
  const { initialActionId, onActionPersisted } = props;
  const state = useActionDeclarationForm(props);
  const viewModel = useActionDeclarationFormViewModel(props, state);

  useEffect(() => {
    if (!state.createdId || state.createdId === initialActionId) return;
    onActionPersisted?.(state.createdId);
  }, [initialActionId, onActionPersisted, state.createdId]);

  if (viewModel.isHydratingAction) return <ActionDeclarationFormStatus error={null} />;
  if (viewModel.hydrationError) return <ActionDeclarationFormStatus error={viewModel.hydrationError} />;

  return (
    <>
      <ActionDeclarationFormOverlays {...viewModel.overlays} />
      <ActionDeclarationFormSurface {...viewModel.surface} />
    </>
  );
}

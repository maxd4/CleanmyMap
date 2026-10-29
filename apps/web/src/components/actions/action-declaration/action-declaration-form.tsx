"use client";

import { ActionDeclarationFormBody } from "./action-declaration-form-body";
import type { ActionDeclarationFormProps } from "./action-declaration-form.types";
import { ActionPollutionScoreReferencesProvider } from "../map/scores/action-pollution-score-references-context";

export function ActionDeclarationForm(props: ActionDeclarationFormProps) {
  return (
    <ActionPollutionScoreReferencesProvider>
      <ActionDeclarationFormBody {...props} />
    </ActionPollutionScoreReferencesProvider>
  );
}

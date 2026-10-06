import type { FormState } from "../model";
import type { BeforeActionFieldUpdater } from "./model";

export type BaseSectionProps = {
  form: FormState;
  updateField: BeforeActionFieldUpdater;
  updateFields?: (updates: Partial<FormState>) => void;
  hasAttemptedSubmit?: boolean;
  validationIssueFields?: readonly string[];
};

export function hasValidationIssue(
  validationIssueFields: readonly string[] | undefined,
  field: string,
): boolean {
  return validationIssueFields?.includes(field) ?? false;
}

export function RequiredMark() {
  return (
    <span className="ml-1 text-xs font-semibold text-rose-700">Obligatoire</span>
  );
}

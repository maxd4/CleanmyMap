import { Building, Calendar } from "lucide-react";
import { OrganizerCombobox } from "@/components/actions/organizer-combobox";
import { ORGANIZER_TYPE_OPTIONS } from "@/lib/actions/organizer-type";
import type { ActiveRole } from "@/lib/domain-language";
import type { FormState } from "../model";
import {
  compactInputCls,
  Field,
  inputCls,
  inputErrCls,
  SectionTitle,
} from "./action-step-identity.ui";

type UpdateField = <K extends keyof FormState>(
  key: K,
  value: FormState[K],
) => void;

type OrganizerSectionProps = {
  form: FormState;
  updateField: UpdateField;
  updateFields: (updates: Partial<FormState>) => void;
  userMetadata: {
    activeRole?: ActiveRole;
    displayName?: string;
    handle?: string;
    username?: string;
  };
  isActionMode: boolean;
  hasAttemptedSubmit?: boolean;
  variant: "compact" | "full";
};

type OrganizerRenderProps = {
  form: FormState;
  updateField: UpdateField;
  isActionMode: boolean;
  missingDate: boolean | undefined;
  missingAssociation: boolean;
  missingOrganizerType: boolean | undefined;
  associationErrorId: string;
  organizerTypeErrorId: string;
  dateErrorId: string;
  onAssociationChange: (selection: { id: string | null; name: string }) => void;
  onOrganizerTypeChange: (nextType: FormState["organizerType"]) => void;
  activeRole?: ActiveRole;
};

function OrganizerSelection({
  form,
  isActionMode,
  missingAssociation,
  associationErrorId,
  onChange,
  activeRole,
  className,
  errorClassName,
}: {
  form: FormState;
  isActionMode: boolean;
  missingAssociation: boolean;
  associationErrorId: string;
  onChange: (selection: { id: string | null; name: string }) => void;
  activeRole?: ActiveRole;
  className: string;
  errorClassName?: string;
}) {
  return (
    <div className={className}>
      <OrganizerCombobox
        id="action-organizer-structure"
        organizerType={form.organizerType}
        organizerId={form.organizerId}
        value={
          form.organizerName ||
          (form.organizerType === "spontaneous" ? form.actorName : "")
        }
        activeRole={activeRole}
        onChange={onChange}
        required={isActionMode}
        invalid={missingAssociation}
        describedBy={missingAssociation ? associationErrorId : undefined}
      />
      {missingAssociation ? (
        <p
          id={associationErrorId}
          className={`text-xs font-medium text-rose-700 ${errorClassName ?? ""}`}
        >
          Renseignez un organisateur.
        </p>
      ) : null}
    </div>
  );
}

function OrganizerTypeSelect({
  form,
  isActionMode,
  missingOrganizerType,
  organizerTypeErrorId,
  className,
  placeholder,
  onChange,
}: {
  form: FormState;
  isActionMode: boolean;
  missingOrganizerType: boolean | undefined;
  organizerTypeErrorId: string;
  className: string;
  placeholder: string;
  onChange: (nextType: FormState["organizerType"]) => void;
}) {
  return (
    <select
      id="action-organizer-type"
      className={`${className} appearance-none cursor-pointer ${missingOrganizerType ? inputErrCls : ""}`}
      value={form.organizerType}
      onChange={(event) => onChange(event.target.value as FormState["organizerType"])}
      required={isActionMode}
      aria-invalid={missingOrganizerType}
      aria-describedby={missingOrganizerType ? organizerTypeErrorId : undefined}
    >
      <option value="">{placeholder}</option>
      {ORGANIZER_TYPE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function CompactOrganizerSection({
  form,
  updateField,
  isActionMode,
  missingDate,
  missingAssociation,
  missingOrganizerType,
  associationErrorId,
  organizerTypeErrorId,
  dateErrorId,
  onAssociationChange,
  onOrganizerTypeChange,
  activeRole,
}: OrganizerRenderProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="space-y-1.5">
        <label
          htmlFor="action-action-date"
          className="text-xs font-semibold text-emerald-900/75"
        >
          Date de l’action <span aria-hidden="true">*</span>
          <span className="ml-2 text-xs font-semibold text-rose-700">
            Obligatoire
          </span>
        </label>
        <input
          id="action-action-date"
          type="date"
          className={`${compactInputCls} ${missingDate ? inputErrCls : ""}`}
          value={form.actionDate}
          onChange={(event) => updateField("actionDate", event.target.value)}
          aria-invalid={missingDate}
          aria-describedby={missingDate ? dateErrorId : undefined}
        />
        {missingDate ? (
          <p id={dateErrorId} className="text-xs font-medium text-rose-700">
            Indiquez la date de l’action.
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="action-organizer-type"
          className="text-xs font-semibold text-emerald-900/75"
        >
          Type de structure <span aria-hidden="true">*</span>
          <span className="ml-2 text-xs font-semibold text-rose-700">
            Obligatoire
          </span>
        </label>
        <OrganizerTypeSelect
          form={form}
          isActionMode={isActionMode}
          missingOrganizerType={missingOrganizerType}
          organizerTypeErrorId={organizerTypeErrorId}
          className={compactInputCls}
          placeholder="Sélectionnez un type"
          onChange={onOrganizerTypeChange}
        />
        {missingOrganizerType ? (
          <p
            id={organizerTypeErrorId}
            className="text-xs font-medium text-rose-700"
          >
            Sélectionnez un type de structure.
          </p>
        ) : null}
      </div>

      {form.organizerType ? (
        <OrganizerSelection
          form={form}
          isActionMode={isActionMode}
          missingAssociation={missingAssociation}
          associationErrorId={associationErrorId}
          onChange={onAssociationChange}
          activeRole={activeRole}
          className="space-y-1.5"
        />
      ) : null}
    </div>
  );
}

function FullOrganizerSection({
  form,
  updateField,
  isActionMode,
  missingDate,
  missingAssociation,
  missingOrganizerType,
  associationErrorId,
  organizerTypeErrorId,
  dateErrorId,
  onAssociationChange,
  onOrganizerTypeChange,
  activeRole,
}: OrganizerRenderProps) {
  return (
    <div>
      <SectionTitle color="bg-violet-500">Cadre &amp; calendrier</SectionTitle>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="action-organizer-type"
            className="pl-1 text-xs font-semibold text-emerald-900/70"
          >
            Type de structure <span aria-hidden="true">*</span>
          </label>
          <Field icon={Building}>
            <OrganizerTypeSelect
              form={form}
              isActionMode={isActionMode}
              missingOrganizerType={missingOrganizerType}
              organizerTypeErrorId={organizerTypeErrorId}
              className={inputCls}
              placeholder="Sélectionnez un type de structure"
              onChange={onOrganizerTypeChange}
            />
          </Field>
          {missingOrganizerType ? (
            <p
              id={organizerTypeErrorId}
              className="pl-1 text-xs font-medium text-rose-700"
            >
              Sélectionnez un type de structure.
            </p>
          ) : null}
        </div>

        {form.organizerType ? (
          <OrganizerSelection
            form={form}
            isActionMode={isActionMode}
            missingAssociation={missingAssociation}
            associationErrorId={associationErrorId}
            onChange={onAssociationChange}
            activeRole={activeRole}
            className="space-y-1"
            errorClassName="pl-1"
          />
        ) : null}

        <div className="space-y-1">
          <Field icon={Calendar}>
            <input
              type="date"
              className={`${inputCls} ${missingDate ? inputErrCls : ""}`}
              value={form.actionDate}
              onChange={(event) => updateField("actionDate", event.target.value)}
              aria-invalid={missingDate}
              aria-describedby={missingDate ? dateErrorId : undefined}
            />
          </Field>
          {missingDate ? (
            <p id={dateErrorId} className="pl-1 text-xs font-medium text-rose-700">
              Indiquez la date de l’action avant de continuer.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ActionOrganizerSection({
  form,
  updateField,
  updateFields,
  userMetadata,
  isActionMode,
  hasAttemptedSubmit,
  variant,
}: OrganizerSectionProps) {
  const missingDate = hasAttemptedSubmit && !form.actionDate;
  const missingAssociation = Boolean(hasAttemptedSubmit && !form.associationName);
  const missingOrganizerType =
    hasAttemptedSubmit && isActionMode && !form.organizerType;
  const associationErrorId = "action-association-error";
  const organizerTypeErrorId = "action-organizer-type-error";
  const dateErrorId = "action-date-error";

  function handleAssociationChange(selection: {
    id: string | null;
    name: string;
  }) {
    updateFields({
      organizerId: selection.id,
      organizerName: selection.name,
      associationName:
        form.organizerType === "spontaneous"
          ? "Action spontanée"
          : selection.name,
    });
  }

  function handleOrganizerTypeChange(nextType: FormState["organizerType"]) {
    updateFields({
      organizerType: nextType,
      organizerId: null,
      organizerName:
        nextType === "spontaneous"
          ? userMetadata.displayName ??
            userMetadata.handle ??
            userMetadata.username ??
            ""
          : "",
      associationName:
        nextType === "spontaneous" ? "Action spontanée" : "",
    });
  }

  const renderProps = {
    form,
    updateField,
    isActionMode,
    missingDate,
    missingAssociation,
    missingOrganizerType,
    associationErrorId,
    organizerTypeErrorId,
    dateErrorId,
    onAssociationChange: handleAssociationChange,
    onOrganizerTypeChange: handleOrganizerTypeChange,
    activeRole: userMetadata.activeRole,
  } satisfies OrganizerRenderProps;

  return variant === "compact" ? (
    <CompactOrganizerSection {...renderProps} />
  ) : (
    <FullOrganizerSection {...renderProps} />
  );
}

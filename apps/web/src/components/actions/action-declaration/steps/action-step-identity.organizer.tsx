import { Calendar } from "lucide-react";
import { OrganizerCombobox } from "@/components/actions/organizer-combobox";
import {
  mergeOrganizerAccountSelection,
  parseOrganizerAccounts,
  preserveSpontaneousOrganizerName,
} from "../payload";
import {
  SPONTANEOUS_PENDING_ORGANIZER_LABEL,
} from "@/lib/actions/organizer-type";
import { ActionOrganizerTypeChoices, getOrganizerFieldPresentation } from "./ActionOrganizerTypeChoices";
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
    userId: string;
    activeRole?: ActiveRole;
    displayName?: string;
    handle?: string;
    username?: string;
  };
  isActionMode: boolean;
  hasAttemptedSubmit?: boolean;
  isExistingAction?: boolean;
  variant: "compact" | "full" | "identity-meta" | "identity-association";
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
  onAssociationChange: (selection: { id: string | null; name: string; accountIds?: string[] }) => void;
  onOrganizerTypeChange: (nextType: FormState["organizerType"]) => void;
  activeRole?: ActiveRole;
  currentUserId: string;
  isExistingAction: boolean;
  organizerLabel: string;
  organizerDescription: string;
};

function OrganizerSelection({
  form,
  isActionMode,
  missingAssociation,
  associationErrorId,
  onChange,
  activeRole,
  currentUserId,
  isExistingAction,
  organizerLabel,
  organizerDescription,
  compact = false,
  className,
  errorClassName,
}: {
  form: FormState;
  isActionMode: boolean;
  missingAssociation: boolean;
  associationErrorId: string;
  onChange: (selection: { id: string | null; name: string; accountIds?: string[] }) => void;
  activeRole?: ActiveRole;
  currentUserId: string;
  isExistingAction: boolean;
  compact?: boolean;
  className: string;
  errorClassName?: string;
  organizerLabel: string;
  organizerDescription: string;
}) {
  return (
    <div className={className}>
      <OrganizerCombobox
        id="action-organizer-structure"
        organizerType={form.organizerType}
        organizerId={form.organizerId}
        value={form.organizerName}
        organizerAccountIds={parseOrganizerAccounts(form.organizerAccounts)}
        currentUserId={currentUserId}
        activeRole={activeRole}
        onChange={onChange}
        required={isActionMode}
        invalid={missingAssociation}
        describedBy={missingAssociation ? associationErrorId : undefined}
        isExistingAction={isExistingAction}
        compact={compact}
        label={organizerLabel}
        description={organizerDescription}
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
  currentUserId,
  isExistingAction,
  organizerLabel,
  organizerDescription,
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
        <ActionOrganizerTypeChoices value={form.organizerType} required={isActionMode} invalid={Boolean(missingOrganizerType)} describedBy={missingOrganizerType ? organizerTypeErrorId : undefined} onChange={onOrganizerTypeChange} />
        {missingOrganizerType ? (
          <p
            id={organizerTypeErrorId}
            className="text-xs font-medium text-rose-700"
          >
            Sélectionnez un type de structure.
          </p>
        ) : null}
      </div>

      <OrganizerSelection
        form={form}
        isActionMode={isActionMode}
        missingAssociation={missingAssociation}
        associationErrorId={associationErrorId}
        onChange={onAssociationChange}
        activeRole={activeRole}
        currentUserId={currentUserId}
        isExistingAction={isExistingAction}
        className="space-y-1.5"
        organizerLabel={organizerLabel}
        organizerDescription={organizerDescription}
      />
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
  currentUserId,
  isExistingAction,
  organizerLabel,
  organizerDescription,
}: OrganizerRenderProps) {
  return (
    <div>
      <SectionTitle color="bg-violet-500">Cadre &amp; calendrier</SectionTitle>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1 md:col-span-3">
          <ActionOrganizerTypeChoices value={form.organizerType} required={isActionMode} invalid={Boolean(missingOrganizerType)} describedBy={missingOrganizerType ? organizerTypeErrorId : undefined} onChange={onOrganizerTypeChange} />
          {missingOrganizerType ? (
            <p
              id={organizerTypeErrorId}
              className="pl-1 text-xs font-medium text-rose-700"
            >
              Sélectionnez un type de structure.
            </p>
          ) : null}
        </div>

        <div className="space-y-1">
          <label htmlFor="action-action-date" className="pl-1 text-xs font-semibold text-emerald-900/70">
            Date de l’action <span aria-hidden="true">{isActionMode ? "*" : ""}</span>
          </label>
          <Field icon={Calendar}>
            <input
              id="action-action-date"
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

        <OrganizerSelection
          form={form}
          isActionMode={isActionMode}
          missingAssociation={missingAssociation}
          associationErrorId={associationErrorId}
          onChange={onAssociationChange}
          activeRole={activeRole}
          currentUserId={currentUserId}
          isExistingAction={isExistingAction}
          className="space-y-1"
          errorClassName="pl-1"
          organizerLabel={organizerLabel}
          organizerDescription={organizerDescription}
        />
      </div>
    </div>
  );
}

function IdentityOrganizerMeta({
  form,
  updateField,
  isActionMode,
  missingDate,
  missingOrganizerType,
  organizerTypeErrorId,
  dateErrorId,
  onOrganizerTypeChange,
}: OrganizerRenderProps) {
  return (
    <div className="min-w-0 space-y-3 sm:col-span-2 xl:col-span-3">
        <ActionOrganizerTypeChoices value={form.organizerType} required={isActionMode} invalid={Boolean(missingOrganizerType)} describedBy={missingOrganizerType ? organizerTypeErrorId : undefined} onChange={onOrganizerTypeChange} />
        {missingOrganizerType ? (
          <p id={organizerTypeErrorId} className="text-xs font-medium text-rose-700">
            Sélectionnez un type de structure.
          </p>
        ) : null}
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="min-w-0 space-y-1.5">
        <label htmlFor="action-action-date" className="sr-only">
          Date de l’action
        </label>
        <input
          id="action-action-date"
          type="date"
          className={`${compactInputCls} ${missingDate ? inputErrCls : ""}`}
          value={form.actionDate}
          onChange={(event) => updateField("actionDate", event.target.value)}
          aria-invalid={missingDate}
          aria-describedby={missingDate ? dateErrorId : undefined}
          required={isActionMode}
        />
        {missingDate ? (
          <p id={dateErrorId} className="text-xs font-medium text-rose-700">
            Indiquez la date de l’action.
          </p>
        ) : null}
      </div>
      </div>
    </div>
  );
}

function IdentityOrganizerAssociation({
  form,
  isActionMode,
  missingAssociation,
  associationErrorId,
  onAssociationChange,
  activeRole,
  currentUserId,
  isExistingAction,
  organizerLabel,
  organizerDescription,
}: OrganizerRenderProps) {
  return (
    <OrganizerSelection
      form={form}
      isActionMode={isActionMode}
      missingAssociation={missingAssociation}
      associationErrorId={associationErrorId}
      onChange={onAssociationChange}
      activeRole={activeRole}
      currentUserId={currentUserId}
      isExistingAction={isExistingAction}
      compact
      className="min-w-0 space-y-1.5"
      organizerLabel={organizerLabel}
      organizerDescription={organizerDescription}
    />
  );
}

export function ActionOrganizerSection({
  form,
  updateField,
  updateFields,
  userMetadata,
  isActionMode,
  hasAttemptedSubmit,
  isExistingAction = false,
  variant,
}: OrganizerSectionProps) {
  const missingDate = hasAttemptedSubmit && !form.actionDate;
  const missingAssociation = Boolean(hasAttemptedSubmit && !form.associationName);
  const missingOrganizerType =
    hasAttemptedSubmit && isActionMode && !form.organizerType;
  const associationErrorId = "action-association-error";
  const organizerTypeErrorId = "action-organizer-type-error";
  const dateErrorId = "action-date-error";
  const { label: organizerLabel, description: organizerDescription } = getOrganizerFieldPresentation(form.organizerType);

  function handleAssociationChange(selection: {
    id: string | null;
    name: string;
    accountIds?: string[];
    referenceStatus?: FormState["organizerReferenceStatus"];
  }) {
    const spontaneousAccountIds =
      form.organizerType === "spontaneous"
        ? mergeOrganizerAccountSelection(form.organizerAccounts, selection.accountIds, {
            persistedPrimaryId: isExistingAction ? parseOrganizerAccounts(form.organizerAccounts)[0] : undefined,
          })
        : null;
    const selectedAccountId = parseOrganizerAccounts((selection.accountIds ?? []).join(", "))[0];
    const selectedAccountWasAccepted =
      !selectedAccountId || spontaneousAccountIds?.includes(selectedAccountId);
    const persistedPrimaryId = isExistingAction ? parseOrganizerAccounts(form.organizerAccounts)[0] : undefined;
    let organizerName = selection.name;
    if (form.organizerType === "spontaneous" && spontaneousAccountIds) {
      organizerName = persistedPrimaryId && selectedAccountId !== persistedPrimaryId
        ? form.organizerName.trim() && form.organizerName !== SPONTANEOUS_PENDING_ORGANIZER_LABEL
          ? form.organizerName.trim()
          : SPONTANEOUS_PENDING_ORGANIZER_LABEL
        : preserveSpontaneousOrganizerName(form.organizerName, selectedAccountWasAccepted ? selection.name : SPONTANEOUS_PENDING_ORGANIZER_LABEL, spontaneousAccountIds);
    }
    updateFields({
      organizerId: selection.id,
      organizerName,
      organizerReferenceStatus: selection.referenceStatus ?? null,
      ...(spontaneousAccountIds ? { organizerAccounts: spontaneousAccountIds.join(", ") } : {}),
      associationName:
        form.organizerType === "spontaneous"
          ? "Action spontanée"
          : selection.name,
    });
  }

  function handleOrganizerTypeChange(nextType: FormState["organizerType"]) {
    updateFields({ organizerType: nextType });
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
    currentUserId: userMetadata.userId,
    isExistingAction,
    organizerLabel,
    organizerDescription,
  } satisfies OrganizerRenderProps;

  if (variant === "compact") return <CompactOrganizerSection {...renderProps} />;
  if (variant === "identity-meta") return <IdentityOrganizerMeta {...renderProps} />;
  if (variant === "identity-association") return <IdentityOrganizerAssociation {...renderProps} />;
  return <FullOrganizerSection {...renderProps} />;
}

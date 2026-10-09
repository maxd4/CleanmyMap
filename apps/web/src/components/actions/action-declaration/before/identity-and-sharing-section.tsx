"use client";

import { ClipboardList } from "lucide-react";
import { ORGANIZER_TYPE_OPTIONS } from "@/lib/actions/organizer-type";
import { OrganizerCombobox } from "@/components/actions/organizer-combobox";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { ActionFormDisclosureSummary } from "../action-form-disclosure-summary";
import type { FormState } from "../model";
import type { ActiveRole } from "@/lib/domain-language";
import { ActionParticipantPicker } from "../../action-participant-picker";
import { normalizeParticipantAccounts, parseOrganizerAccounts } from "../payload";
import { PREPARATION_STATE_OPTIONS } from "./model";
import { FieldShell, GroupJoinPublishCard, SectionLabel, SelectShell } from "./ui";
import { cn } from "@/lib/utils";
import { hasValidationIssue, RequiredMark, type BaseSectionProps } from "./section-contract";

type IdentityAndSharingSectionProps = BaseSectionProps & {
  userMetadata: {
    userId: string;
    activeRole?: ActiveRole;
    displayName?: string;
    handle?: string;
    username?: string;
  };
  showGroupJoinHelp: boolean;
  onToggleGroupJoinHelp: () => void;
};

export function IdentityAndSharingSection({
  form,
  updateField,
  updateFields,
  userMetadata,
  showGroupJoinHelp,
  onToggleGroupJoinHelp,
  hasAttemptedSubmit,
  validationIssueFields,
}: IdentityAndSharingSectionProps) {
  const missingOrganizerType = Boolean(hasAttemptedSubmit && hasValidationIssue(validationIssueFields, "organizerType"));
  const missingAssociation = Boolean(hasAttemptedSubmit && hasValidationIssue(validationIssueFields, "associationName"));

  return (
    <CmmCard tone="emerald" variant="glass" size="lg">
      <div className="space-y-6">
        <SectionLabel
          icon={ClipboardList}
          title="Identité et organisation"
          subtitle="Qui porte le formulaire, dans quel cadre, et si le groupe peut rejoindre l'action."
        />

        <IdentityFieldGrid
          form={form}
          updateField={updateField}
          updateFields={updateFields}
          userMetadata={userMetadata}
          missingOrganizerType={missingOrganizerType}
          missingAssociation={missingAssociation}
        />

        <AssociatedAccountsFields
          form={form}
          updateField={updateField}
          currentUserId={userMetadata.userId}
        />

        <GroupJoinPublishCard
          checked={form.groupJoinEnabled}
          onChange={(next) => updateField("groupJoinEnabled", next)}
          showHelp={showGroupJoinHelp}
          onToggleHelp={onToggleGroupJoinHelp}
        />
      </div>
    </CmmCard>
  );
}

function IdentityFieldGrid({
  form,
  updateField,
  updateFields,
  userMetadata,
  missingOrganizerType,
  missingAssociation,
}: Pick<IdentityAndSharingSectionProps, "form" | "updateField" | "updateFields" | "userMetadata"> & {
  missingOrganizerType: boolean;
  missingAssociation: boolean;
}) {
  const organizerName = form.organizerName;
  const creatorDisplayName = userMetadata.displayName?.trim()
    || userMetadata.handle?.trim()
    || userMetadata.username?.trim()
    || userMetadata.userId;
  const creatorHandle = userMetadata.handle?.trim() || userMetadata.username?.trim();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <FieldShell label="Référent ou créateur">
        <input
          value={creatorDisplayName}
          readOnly
          aria-readonly="true"
          data-clerk-user-id={userMetadata.userId}
          className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
        />
        {creatorHandle ? <span className="mt-1 block text-xs text-emerald-900/60">@{creatorHandle}</span> : null}
      </FieldShell>

      <FieldShell label={<span>Type de structure<RequiredMark /></span>} hint="Indiquez le cadre de l’action, indépendamment du nom de l’organisateur.">
        <select
          id="before-organizer-type"
          value={form.organizerType}
          onChange={(event) => updateField("organizerType", event.target.value as FormState["organizerType"])}
          required
          aria-invalid={missingOrganizerType}
          aria-describedby={missingOrganizerType ? "before-organizer-type-error" : undefined}
          className={cn("w-full rounded-2xl border bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white", missingOrganizerType ? "border-rose-400 ring-2 ring-rose-400/20" : "border-emerald-200/70")}
        >
          <option value="">Sélectionnez un type de structure</option>
          {ORGANIZER_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {missingOrganizerType ? <span id="before-organizer-type-error" className="block text-xs font-medium text-rose-700">Sélectionnez un type de structure.</span> : null}
      </FieldShell>

      <FieldShell label="">
        <OrganizerCombobox
          id="before-organizer-structure"
          organizerType={form.organizerType}
          organizerId={form.organizerId}
          value={organizerName}
          organizerAccountIds={parseOrganizerAccounts(form.organizerAccounts)}
          currentUserId={userMetadata.userId}
          activeRole={userMetadata.activeRole}
          onChange={({ id, name, accountIds }) => updateFields?.({
            organizerId: id,
            organizerName: name,
            ...(form.organizerType === "spontaneous" && accountIds
              ? { organizerAccounts: accountIds.join(", ") }
              : {}),
          })}
          required
          invalid={missingAssociation}
          describedBy={missingAssociation ? "before-organizer-structure-error" : undefined}
        />
        {missingAssociation ? <span id="before-organizer-structure-error" className="block text-xs font-medium text-rose-700">Renseignez un organisateur.</span> : null}
      </FieldShell>

      <SelectShell label="État de préparation" value={form.preparationState} onChange={(value) => updateField("preparationState", value as FormState["preparationState"])} options={PREPARATION_STATE_OPTIONS} />
    </div>
  );
}

function AssociatedAccountsFields({
  form,
  updateField,
  currentUserId,
}: {
  form: FormState;
  updateField: BaseSectionProps["updateField"];
  currentUserId: string;
}) {
  const organizerAccountIds = parseOrganizerAccounts(form.organizerAccounts);
  const participantAccountIds = normalizeParticipantAccounts(form.participantAccounts);

  return (
    <>
      {form.organizerType && form.organizerType !== "spontaneous" ? (
        <CmmDisclosure
          summary={<ActionFormDisclosureSummary label="Organisateurs associés" detail={organizerAccountIds.length ? `${organizerAccountIds.length} organisateur${organizerAccountIds.length > 1 ? "s" : ""}` : undefined} />}
          tone="emerald"
          size="md"
        >
          <ActionParticipantPicker
            currentUserId={currentUserId}
            value={organizerAccountIds}
            onChange={(next) => updateField("organizerAccounts", next.join(", "))}
            endpoint="/api/actions/account-options"
            title="Organisateurs associés"
            description="Recherchez les autres comptes CleanMyMap autorisés à organiser cette action."
          />
        </CmmDisclosure>
      ) : null}

      <CmmDisclosure
        summary={<ActionFormDisclosureSummary label="Participants associés" detail={participantAccountIds.length ? `${participantAccountIds.length} participant${participantAccountIds.length > 1 ? "s" : ""}` : undefined} />}
        tone="emerald"
        size="md"
      >
        <ActionParticipantPicker
          currentUserId={currentUserId}
          value={participantAccountIds}
          onChange={(next) => updateField("participantAccounts", next)}
          endpoint="/api/actions/account-options"
          description="Ajoutez des membres connus avant de publier l'action ou de passer au formulaire complet."
        />
      </CmmDisclosure>
    </>
  );
}

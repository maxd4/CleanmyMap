import { ActionParticipantPicker } from "../../action-participant-picker";
import { normalizeVolunteerParticipationFromForm } from "@/lib/actions/volunteer-participation";
import type { FormState } from "../model";
import {
  Field,
  inputCls,
  compactInputCls,
} from "./action-step-identity.ui";
import { Users } from "lucide-react";

type UpdateField = <K extends keyof FormState>(
  key: K,
  value: FormState[K],
) => void;

type ParticipantSectionProps = {
  form: FormState;
  updateField: UpdateField;
  userId: string;
  variant: "compact" | "supporting" | "counts";
  isActionMode: boolean;
  supportingFull?: boolean;
};

function ParticipantCounts({
  form,
  updateField,
  compact,
}: {
  form: FormState;
  updateField: UpdateField;
  compact: boolean;
}) {
  const participation = normalizeVolunteerParticipationFromForm(form);
  const inputClassName = compact ? compactInputCls : inputCls;

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {([
            ["action-children-count", "Enfants", "childrenCount"],
            ["action-adult-count", "Adultes", "adultCount"],
            ["action-retired-count", "Retraités", "retiredCount"],
          ] as const).map(([id, label, key]) => (
            <label key={id} htmlFor={id} className="space-y-1.5">
              <span className="block text-xs font-semibold text-emerald-900/75">
                {label}
              </span>
              <input
                id={id}
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="0"
                className={inputClassName}
                value={form[key]}
                onChange={(event) => updateField(key, event.target.value)}
              />
            </label>
          ))}
        </div>
        <p className="text-xs font-semibold text-emerald-900/70">
          Total calculé : {participation.participantsCount ?? "—"} participant(s)
        </p>
        <p className="text-xs text-emerald-900/55">
          Si une catégorie est renseignée, renseignez les trois catégories. Le total doit être au moins égal à 1.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
        <Field icon={Users}>
          <label className="sr-only" htmlFor="action-children-count">
            Enfants
          </label>
          <input
            id="action-children-count"
            type="number"
            min="0"
            placeholder="Enfants"
            className={inputClassName}
            value={form.childrenCount}
            onChange={(event) => updateField("childrenCount", event.target.value)}
          />
        </Field>
        <Field icon={Users}>
          <label className="sr-only" htmlFor="action-adult-count">
            Adultes
          </label>
          <input
            id="action-adult-count"
            type="number"
            min="0"
            placeholder="Adultes"
            className={inputClassName}
            value={form.adultCount}
            onChange={(event) => updateField("adultCount", event.target.value)}
          />
        </Field>
        <Field icon={Users}>
          <label className="sr-only" htmlFor="action-retired-count">
            Retraités
          </label>
          <input
            id="action-retired-count"
            type="number"
            min="0"
            placeholder="Retraités"
            className={inputClassName}
            value={form.retiredCount}
            onChange={(event) => updateField("retiredCount", event.target.value)}
          />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-emerald-900/65">
        <span>Total calculé : {participation.participantsCount ?? "—"} participant(s)</span>
        <span>Unités opérationnelles : {participation.effectiveVolunteerUnits ?? "—"}</span>
      </div>
    </div>
  );
}

function SupportingParticipation({
  form,
  updateField,
  userId,
  isActionMode,
  full,
}: Omit<ParticipantSectionProps, "variant"> & { full: boolean }) {
  if (!isActionMode) {
    return null;
  }

  return (
    <>
      {form.organizerType !== "spontaneous" ? (
        <div className="mt-3 space-y-1">
          {full ? (
            <Field icon={Users}>
              <input
                type="text"
                className={inputCls}
                placeholder="Pseudo, nom affiché ou ID, séparés par des virgules"
                value={form.organizerAccounts}
                onChange={(event) => updateField("organizerAccounts", event.target.value)}
                maxLength={300}
              />
            </Field>
          ) : (
            <>
              <label
                htmlFor="action-organizer-accounts"
                className="text-xs font-semibold text-emerald-900/75"
              >
                Organisateurs associés
              </label>
              <input
                id="action-organizer-accounts"
                type="text"
                className={compactInputCls}
                value={form.organizerAccounts}
                onChange={(event) => updateField("organizerAccounts", event.target.value)}
                maxLength={300}
                placeholder="Pseudo, nom affiché ou ID"
              />
            </>
          )}
          {full ? (
            <p className="pl-1 text-xs text-emerald-900/55">
              Renseignez les comptes qui ont réellement organisé l&apos;action. La récompense de création sera partagée entre eux si l&apos;action est validée.
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="mt-4">
        <ActionParticipantPicker
          currentUserId={userId}
          value={form.participantAccounts}
          onChange={(next) => updateField("participantAccounts", next)}
          description={
            full
              ? "Ajoutez les participants connus avant l'envoi du formulaire complet."
              : "Ajoutez les participants connus avant l’envoi du formulaire complet."
          }
        />
      </div>
    </>
  );
}

export function ActionParticipantSection({
  form,
  updateField,
  userId,
  variant,
  isActionMode,
  supportingFull,
}: ParticipantSectionProps) {
  if (variant === "compact") {
    return <ParticipantCounts form={form} updateField={updateField} compact />;
  }

  if (variant === "counts") {
    return <ParticipantCounts form={form} updateField={updateField} compact={false} />;
  }

  return (
    <SupportingParticipation
      form={form}
      updateField={updateField}
      userId={userId}
      isActionMode={isActionMode}
      full={supportingFull ?? false}
    />
  );
}

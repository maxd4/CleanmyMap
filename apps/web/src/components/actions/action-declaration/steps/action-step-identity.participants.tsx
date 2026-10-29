import { ActionParticipantPicker } from "../../action-participant-picker";
import {
  deriveAdultCountFromTotal,
  deriveVolunteerParticipationFromTotal,
  getVolunteerActionCompositionValidationMessage,
  normalizeVolunteerParticipation,
} from "@/lib/actions/volunteer-participation";
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
  const volunteersCount = form.volunteersCount.trim() === ""
    ? null
    : Number(form.volunteersCount);
  const childrenCount = form.childrenCount.trim() === ""
    ? null
    : Number(form.childrenCount);
  const retiredCount = form.retiredCount.trim() === ""
    ? null
    : Number(form.retiredCount);
  const adultCount = deriveAdultCountFromTotal({
    volunteersCount,
    childrenCount,
    retiredCount,
  });
  const participation = normalizeVolunteerParticipation(
    deriveVolunteerParticipationFromTotal({
      volunteersCount,
      childrenCount,
      retiredCount,
    }),
  );
  const hasParticipantEntry =
    form.volunteersCount.trim() !== "" ||
    form.childrenCount.trim() !== "0" ||
    form.retiredCount.trim() !== "0";
  const compositionMessage = hasParticipantEntry
    ? getVolunteerActionCompositionValidationMessage({
        volunteersCount,
        childrenCount,
        retiredCount,
      })
    : null;
  const inputClassName = compact ? compactInputCls : inputCls;
  const totalInput = (
    <label htmlFor="action-volunteers-count" className="space-y-1.5">
      <span className="block text-sm font-semibold text-emerald-950">
        Nombre total de participants
      </span>
      <input
        id="action-volunteers-count"
        type="number"
        min="1"
        max="500"
        step="1"
        inputMode="numeric"
        placeholder="Ex. 8"
        className={inputClassName}
        value={form.volunteersCount}
        onChange={(event) => updateField("volunteersCount", event.target.value)}
      />
      <span className="block text-xs font-normal text-emerald-900/60">
        Comptez les personnes réellement présentes, sans compter automatiquement les comptes organisateurs.
      </span>
    </label>
  );
  const categoryInputs = ([
    ["action-children-count", "Enfants", "childrenCount"],
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
        max="500"
        step="1"
        inputMode="numeric"
        placeholder="0"
        className={inputClassName}
        value={form[key]}
        onChange={(event) => updateField(key, event.target.value)}
      />
    </label>
  ));

  if (compact) {
    return (
      <div className="space-y-2">
        {totalInput}
        <fieldset className="space-y-2 pt-2">
          <legend className="text-xs font-semibold text-emerald-900/75">
            Composition du groupe
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{categoryInputs}</div>
          <p className="text-xs text-emerald-900/55">
            Les adultes sont calculés automatiquement : total moins enfants et retraités.
          </p>
          <p className="text-xs font-semibold text-emerald-900/70">
            {adultCount !== null && adultCount >= 0
              ? `${adultCount} adulte${adultCount > 1 ? "s" : ""} calculé${adultCount > 1 ? "s" : ""} automatiquement`
              : "Adultes calculés automatiquement : —"}
          </p>
          {compositionMessage ? (
            <p className="text-xs font-medium text-rose-700" role="alert">
              {compositionMessage}
            </p>
          ) : null}
        </fieldset>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Field icon={Users}>{totalInput}</Field>
      <fieldset className="space-y-2">
        <legend className="pl-1 text-xs font-semibold text-emerald-900/75">
          Composition du groupe
        </legend>
        <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
          {categoryInputs}
        </div>
        <p className="pl-1 text-xs text-emerald-900/55">
          Les adultes sont calculés automatiquement : total moins enfants et retraités.
        </p>
        <p className="pl-1 text-xs font-semibold text-emerald-900/70">
          {adultCount !== null && adultCount >= 0
            ? `${adultCount} adulte${adultCount > 1 ? "s" : ""} calculé${adultCount > 1 ? "s" : ""} automatiquement`
            : "Adultes calculés automatiquement : —"}
        </p>
        {compositionMessage ? (
          <p className="pl-1 text-xs font-medium text-rose-700" role="alert">
            {compositionMessage}
          </p>
        ) : null}
      </fieldset>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-emerald-900/65">
        <span>Total déclaré : {form.volunteersCount.trim() || "—"} participant(s)</span>
        <span>
          Unités opérationnelles : {participation.effectiveVolunteerUnits ?? "—"}
        </span>
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
            <div className="space-y-1">
              <label htmlFor="action-organizer-accounts" className="pl-1 text-xs font-semibold text-emerald-900/75">
                Comptes coorganisateurs
              </label>
              <Field icon={Users}>
                <input
                  id="action-organizer-accounts"
                  type="text"
                  className={inputCls}
                  placeholder="Pseudo, nom affiché ou ID, séparés par des virgules"
                  value={form.organizerAccounts}
                  onChange={(event) => updateField("organizerAccounts", event.target.value)}
                  maxLength={300}
                />
              </Field>
            </div>
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
              Renseignez les comptes qui ont réellement organisé l&apos;action. Ils restent distincts du nombre de participants présents.
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="mt-4">
        <ActionParticipantPicker
          currentUserId={userId}
          value={form.participantAccounts}
          onChange={(next) => updateField("participantAccounts", next)}
          endpoint="/api/actions/account-options"
          description={
            full
              ? "Ajoutez les comptes participants identifiés. Une sélection ne confirme pas leur présence terrain."
              : "Comptes identifiés uniquement ; leur sélection ne confirme pas une présence terrain."
          }
          title="Comptes participants identifiés"
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

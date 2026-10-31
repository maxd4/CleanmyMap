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
import { suggestPreActionContext } from "@/lib/actions/action-context";

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
  showOrganizerAccounts?: boolean;
  showParticipantAccounts?: boolean;
};

function ParticipantContextControl({
  form,
  updateField,
  inputClassName,
  contextSuggestion,
}: {
  form: FormState;
  updateField: UpdateField;
  inputClassName: string;
  contextSuggestion: ReturnType<typeof suggestPreActionContext>;
}) {
  const schoolJourneySuggested =
    form.actionContext === "school" ||
    (form.actionContext === "" && contextSuggestion.context === "school");
  return (
    <div className="space-y-1.5 rounded-xl border border-emerald-900/10 bg-emerald-50/60 p-3">
      <label
        htmlFor="action-context"
        className="block text-xs font-semibold text-emerald-950"
      >
        Contexte de l’action
      </label>
      <select
        id="action-context"
        className={inputClassName}
        value={form.actionContext}
        onChange={(event) => {
          const next = event.target.value as FormState["actionContext"];
          updateField("actionContext", next);
          updateField("schoolContextConfirmed", next === "school");
        }}
      >
        <option value="">Automatique selon la composition finale</option>
        <option value="citizen">Citoyenne</option>
        <option value="company">Entreprise</option>
        <option value="school">Scolaire</option>
      </select>
      <p className="text-xs text-emerald-900/65">
        Le contexte est indépendant du type d’organisateur. La famille reste un
        cas citoyen.
      </p>
      {form.actionContext === "" && contextSuggestion.context === "school" ? (
        <p className="text-xs font-semibold text-emerald-800" role="status">
          Proposition automatique : scolaire, car les enfants représentent
          strictement plus des deux tiers du groupe déclaré. Cette proposition
          n’est pas une preuve d’organisation scolaire et sera recalculée à la
          finalisation.
        </p>
      ) : null}
      {form.actionContext !== "" ? (
        <p className="text-xs font-semibold text-emerald-800" role="status">
          Choix explicite conservé jusqu’à une remise en mode automatique.
        </p>
      ) : null}
      {schoolJourneySuggested ? (
        <div className="space-y-2 rounded-lg border border-sky-900/10 bg-sky-50/70 p-3 text-xs text-sky-950">
          <p className="font-semibold">Parcours école : préparer, agir, faire le bilan</p>
          <p>
            Retrouvez le quiz et l&apos;atelier existants dans l&apos;espace
            pédagogique{" "}
            <a className="font-semibold underline" href="/learn/ecole">
              /learn/ecole
            </a>
            . Aucun compte élève ni résultat de quiz n&apos;est nécessaire pour
            l&apos;action.
          </p>
          <p>
            Les élèves restent sur les déchets ordinaires avec encadrement
            adulte ; les adultes prennent en charge les mégots, objets
            dangereux et toute situation à risque. Gants, pinces et sacs
            adaptés restent nécessaires.
          </p>
          {form.actionContext === "" ? (
            <p className="font-semibold text-sky-900">
              La proposition automatique aide à préparer l&apos;action, mais ne
              déclenche aucune reconnaissance scolaire sans confirmation
              explicite.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ParticipantCountInputs({
  form,
  updateField,
  compact,
  adultCount,
  participation,
  compositionMessage,
  volunteersCount,
  childrenCount,
  retiredCount,
}: {
  form: FormState;
  updateField: UpdateField;
  compact: boolean;
  adultCount: number | null;
  participation: ReturnType<typeof normalizeVolunteerParticipation>;
  compositionMessage: string | null;
  volunteersCount: number | null;
  childrenCount: number | null;
  retiredCount: number | null;
}) {
  const inputClassName = compact ? compactInputCls : inputCls;
  const contextSuggestion = suggestPreActionContext({
    volunteersCount,
    childrenCount,
    retiredCount,
  });
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
        Comptez les personnes réellement présentes, sans compter
        automatiquement les comptes organisateurs.
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
  const feedback = (
    <>
      <p className="text-xs text-emerald-900/55">
        Les adultes sont calculés automatiquement : total moins enfants et
        retraités.
      </p>
      <p className="text-xs font-semibold text-emerald-900/70">
        {adultCount !== null && adultCount >= 0
          ? `${adultCount} adulte${adultCount > 1 ? "s" : ""} calculé${
              adultCount > 1 ? "s" : ""
            } automatiquement`
          : "Adultes calculés automatiquement : —"}
      </p>
      {compositionMessage ? (
        <p className="text-xs font-medium text-rose-700" role="alert">
          {compositionMessage}
        </p>
      ) : null}
    </>
  );
  const group = (
    <fieldset className="space-y-2">
      <legend
        className={
          compact
            ? "text-xs font-semibold text-emerald-900/75"
            : "pl-1 text-xs font-semibold text-emerald-900/75"
        }
      >
        Composition du groupe
      </legend>
      <div
        className={
          compact
            ? "grid grid-cols-1 gap-3 sm:grid-cols-2"
            : "grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2"
        }
      >
        {categoryInputs}
      </div>
      <div className={compact ? "" : "pl-1"}>{feedback}</div>
      <ParticipantContextControl
        form={form}
        updateField={updateField}
        inputClassName={inputClassName}
        contextSuggestion={contextSuggestion}
      />
    </fieldset>
  );
  if (compact) return <div className="space-y-2">{totalInput}{group}</div>;
  return (
    <div className="space-y-4">
      <Field icon={Users}>{totalInput}</Field>
      {group}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-emerald-900/65">
        <span>Total déclaré : {form.volunteersCount.trim() || "—"} participant(s)</span>
        <span>
          Unités opérationnelles : {participation.effectiveVolunteerUnits ?? "—"}
        </span>
      </div>
    </div>
  );
}

function ParticipantCounts({ form, updateField, compact }: { form: FormState; updateField: UpdateField; compact: boolean }) {
  const volunteersCount = form.volunteersCount.trim() === "" ? null : Number(form.volunteersCount);
  const childrenCount = form.childrenCount.trim() === "" ? null : Number(form.childrenCount);
  const retiredCount = form.retiredCount.trim() === "" ? null : Number(form.retiredCount);
  const adultCount = deriveAdultCountFromTotal({ volunteersCount, childrenCount, retiredCount });
  const participation = normalizeVolunteerParticipation(deriveVolunteerParticipationFromTotal({ volunteersCount, childrenCount, retiredCount }));
  const hasParticipantEntry = form.volunteersCount.trim() !== "" || form.childrenCount.trim() !== "0" || form.retiredCount.trim() !== "0";
  const compositionMessage = hasParticipantEntry ? getVolunteerActionCompositionValidationMessage({ volunteersCount, childrenCount, retiredCount }) : null;
  return (
    <ParticipantCountInputs
      form={form}
      updateField={updateField}
      compact={compact}
      adultCount={adultCount}
      participation={participation}
      compositionMessage={compositionMessage}
      volunteersCount={volunteersCount}
      childrenCount={childrenCount}
      retiredCount={retiredCount}
    />
  );
}

function SupportingParticipation({
  form,
  updateField,
  userId,
  isActionMode,
  full,
  showOrganizerAccounts,
  showParticipantAccounts,
}: Omit<ParticipantSectionProps, "variant"> & {
  full: boolean;
  showOrganizerAccounts: boolean;
  showParticipantAccounts: boolean;
}) {
  if (!isActionMode) {
    return null;
  }

  return (
    <>
      {showOrganizerAccounts && form.organizerType !== "spontaneous" ? (
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
      {showParticipantAccounts ? (
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
      ) : null}
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
  showOrganizerAccounts = true,
  showParticipantAccounts = true,
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
      showOrganizerAccounts={showOrganizerAccounts}
      showParticipantAccounts={showParticipantAccounts}
    />
  );
}

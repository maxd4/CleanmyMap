"use client";

import { useEffect, useState } from "react";
import type { ActiveRole } from "@/lib/domain-language";
import type { ActionManualInvitationStatusRecord } from "@/lib/actions/participation/registration-records";
import { ActionSafetyGuide } from "@/components/actions/action-safety-guide";
import type { FormState } from "../model";
import type { BeforeActionFieldUpdater } from "./model";
import { IdentityAndSharingSection, VolunteerRegistrationPanel } from "./identity-and-sharing-section";
import { PreparationPlanningFields } from "./preparation-planning-fields";
import { PreparationEquipmentFields } from "./preparation-equipment-fields";
import { PreparationSecurityFields } from "./preparation-security-fields";
import { PreparationAccessibilityFields } from "./preparation-accessibility-fields";
import { PreparationChecklistFields } from "./preparation-checklist-fields";
import { ActionFieldRolesPanel } from "../../action-field-roles-panel";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { ActionFormDisclosureSummary } from "../action-form-disclosure-summary";
import { parseOrganizerAccounts, normalizeParticipantAccounts } from "../payload";
import { PreparationLogisticsNotesFields } from "./preparation-and-safety-section";
import {
  characterLimitError,
  PREPARATION_FIELD_LIMITS,
} from "./preparation-field-utils";

type TeamDisclosureId = "coordination" | "equipment" | "safety" | "logistics";

const ACCESSIBILITY_STATUS_LABELS: Record<FormState["accessibilityStatus"], string> = {
  not_evaluated: "non évaluée",
  conditions_reported: "conditions renseignées",
  obstacles_identified: "obstacles identifiés",
  to_confirm: "à confirmer",
};

function hasAnyFieldIssue(
  validationIssueFields: readonly string[],
  fields: readonly string[],
): boolean {
  return fields.some((field) => validationIssueFields.includes(field));
}

function getExpectedParticipantSummary(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return "Effectif attendu : non renseigné";
  return `Effectif attendu : ${Number(trimmed)} (prévision)`;
}

type TeamLogisticsSectionProps = {
  form: FormState;
  updateField: BeforeActionFieldUpdater;
  updateFields: (updates: Partial<FormState>) => void;
  userMetadata: {
    userId: string;
    activeRole?: ActiveRole;
    handle?: string;
    username?: string;
    displayName?: string;
  };
  showGroupJoinHelp: boolean;
  onToggleGroupJoinHelp: () => void;
  invitationStatuses: ActionManualInvitationStatusRecord[];
  validationIssueFields: readonly string[];
  actionId?: string | null;
  isExistingAction?: boolean;
};

export function TeamLogisticsSection({
  form,
  updateField,
  updateFields,
  userMetadata,
  showGroupJoinHelp,
  onToggleGroupJoinHelp,
  invitationStatuses,
  validationIssueFields,
  actionId,
  isExistingAction = false,
}: TeamLogisticsSectionProps) {
  const [openDisclosures, setOpenDisclosures] = useState<Record<TeamDisclosureId, boolean>>({
    coordination: false,
    equipment: false,
    safety: false,
    logistics: false,
  });

  const partnerCount = (form.organizationalRelations.partners ?? []).filter((partner) => partner.name.trim()).length;
  const organizerAccountCount = parseOrganizerAccounts(form.organizerAccounts).length;
  const invitationAccountCount = normalizeParticipantAccounts(form.participantAccounts).length;
  const equipmentLinesCount = Object.values(form.equipmentInventory).filter((value) => value !== undefined).length;
  const completedChecklistCount = form.preparationChecklist.filter((item) => item.checked).length;
  const expectedWasteCount = form.wasteCategories?.length ?? 0;
  const interventionMode = form.interventionMode?.mode ?? (form.operationalRoute ? "itinerary" : "fixed_area");
  const terrainInterventionMode = form.interventionMode?.mode ?? (form.operationalRoute ? "itinerary" : undefined);
  const terrainGuidance = terrainInterventionMode === "fixed_area"
    ? "Zone fixe : repérer les accès piétons autour du rendez-vous et vérifier sur place les obstacles et l’état du sol."
    : terrainInterventionMode === "itinerary"
      ? "Itinéraire : parcourir les traversées et cheminements prévus, vérifier les obstacles et repérer les points où le groupe peut s’arrêter ou sortir du parcours."
      : terrainInterventionMode === "multi_zone"
        ? "Plusieurs groupes ou zones : convenir des limites de chaque zone et des points de regroupement. Le nombre de groupes et les conditions du terrain restent à confirmer."
        : "Mode non renseigné : vérifier sur place les accès piétons, obstacles et conditions du sol ; l’adresse seule ne décrit pas leur état actuel.";
  const interventionModeLabel = interventionMode === "multi_zone"
    ? "plusieurs groupes"
    : interventionMode === "itinerary" ? "itinéraire" : "zone fixe";
  const organizerLabel = form.organizerName.trim() || "À préciser";
  const referentLabel = userMetadata.displayName?.trim()
    || userMetadata.handle?.trim()
    || userMetadata.username?.trim()
    || userMetadata.userId;

  const coordinationHasError = hasAnyFieldIssue(validationIssueFields, [
    "organizerAccounts", "organizationalRelations", "participantAccounts", "groupJoinEnabled", "fieldRoleSelections",
  ]);
  const equipmentHasError = hasAnyFieldIssue(validationIssueFields, [
    "recommendedMaterials", "materialsProvided", "equipmentInventory", "refreshmentsProvided",
  ]) || Boolean(
    characterLimitError(form.recommendedMaterials, "Le complément matériel", PREPARATION_FIELD_LIMITS.recommendedMaterials)
    || characterLimitError(form.materialsProvided, "Le matériel fourni", PREPARATION_FIELD_LIMITS.materialsProvided),
  );
  const safetyHasError = hasAnyFieldIssue(validationIssueFields, [
    "safetyInstructions", "accessibility", "accessibilityStatus", "accessibilityAlternativeRouteVersionId",
    "accessibilityConditionsSource", "accessibilityConditionsVerifiedAt", "accessibilityPausePlan",
    "accessibilityEarlyDeparturePlan", "accessibilityAlternativeMissions", "accessibilityAlternativeMissionsText",
  ]) || Boolean(
    characterLimitError(form.safetyInstructions, "Les consignes particulières", PREPARATION_FIELD_LIMITS.safetyInstructions)
    || characterLimitError(form.accessibility, "La précision d'accessibilité", PREPARATION_FIELD_LIMITS.accessibility),
  );
  const logisticsHasError = hasAnyFieldIssue(validationIssueFields, [
    "participantMessage", "placeType", "estimatedDifficulty", "preparationChecklist", "checklistBeforeDeparture", "logisticsNotes",
  ]) || Boolean(
    characterLimitError(form.logisticsNotes, "Les notes logistiques", PREPARATION_FIELD_LIMITS.logisticsNotes)
    || form.preparationChecklist.some((item) => item.key.startsWith("custom_")
      && item.label.length > PREPARATION_FIELD_LIMITS.customChecklistLabel),
  );

  useEffect(() => {
    const errorDisclosures: TeamDisclosureId[] = [];
    if (coordinationHasError) errorDisclosures.push("coordination");
    if (equipmentHasError) errorDisclosures.push("equipment");
    if (safetyHasError) errorDisclosures.push("safety");
    if (logisticsHasError) errorDisclosures.push("logistics");
    if (errorDisclosures.length === 0) return;

    // Validation issues arrive from the parent after submission; sync affected controlled panels once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenDisclosures((current) => {
      const next = { ...current };
      let changed = false;
      for (const id of errorDisclosures) {
        if (!next[id]) {
          next[id] = true;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [coordinationHasError, equipmentHasError, logisticsHasError, safetyHasError]);

  const toggleDisclosure = (id: TeamDisclosureId, open: boolean) => {
    setOpenDisclosures((current) => current[id] === open ? current : { ...current, [id]: open });
  };

  return (
    <div className="space-y-4" data-testid="team-logistics-section">
      <CmmDisclosure
        id="team-logistics-coordination"
        open={openDisclosures.coordination}
        onToggle={(open) => toggleDisclosure("coordination", open)}
        summary={<ActionFormDisclosureSummary label="Coordination et participants" detail={`${partnerCount} partenaire${partnerCount === 1 ? "" : "s"} déclaré${partnerCount === 1 ? "" : "s"} · ${organizerAccountCount} compte${organizerAccountCount === 1 ? "" : "s"} organisateur${organizerAccountCount === 1 ? "" : "s"} sélectionné${organizerAccountCount === 1 ? "" : "s"} · ${invitationAccountCount} membre${invitationAccountCount === 1 ? "" : "s"} sélectionné${invitationAccountCount === 1 ? "" : "s"} pour invitation · ${getExpectedParticipantSummary(form.volunteersCount)}`} />}
        tone="emerald"
        size="md"
      >
        <div className="space-y-4">
          <div className="grid gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 text-sm sm:grid-cols-2">
            <p><span className="font-semibold text-emerald-950">Organisateur :</span> {organizerLabel}</p>
            <p><span className="font-semibold text-emerald-950">Référent de l’étape 1 :</span> {referentLabel}</p>
          </div>
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">
            Les partenaires déclarés décrivent l’organisation et n’accordent pas d’accès. Les comptes ajoutés sous « Organisateurs associés » relèvent du workflow d’organisation de l’action. Les invitations concernent les membres invités et ne confirment ni inscription ni présence ; les responsabilités terrain s’appuient sur les participations confirmées. L’effectif de l’étape 1 reste une prévision.
          </p>
          {form.organizerType === "school" || form.actionContext === "school" ? (
            <p role="note" className="rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-2 text-xs leading-5 text-sky-950">
              Pour cette action scolaire, renseignez l’organisation convenue avec l’établissement et ses référents. Les repères du guide sont des recommandations de préparation, pas des obligations légales universelles.
            </p>
          ) : null}
          {interventionMode === "multi_zone" ? (
            <p role="note" className="rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs leading-5 text-indigo-950">
              Plusieurs groupes ou zones : prévoyez la coordination et les points de regroupement adaptés à chaque zone. Aucun nombre de groupes ni de personnes présentes n’est déduit automatiquement.
            </p>
          ) : null}
          <IdentityAndSharingSection
            form={form}
            updateField={updateField}
            updateFields={updateFields}
            userMetadata={userMetadata}
            showGroupJoinHelp={showGroupJoinHelp}
            onToggleGroupJoinHelp={onToggleGroupJoinHelp}
            showVolunteerRegistration={false}
            fieldMode="coordination"
            embedded
            hasAttemptedSubmit={validationIssueFields.length > 0}
            validationIssueFields={validationIssueFields}
            actionId={actionId}
            isExistingAction={isExistingAction}
          />

          <CmmDisclosure
            summary={<ActionFormDisclosureSummary label="Responsabilités terrain" detail="Rôles liés aux participants confirmés ; aucun droit d’organisation supplémentaire." />}
            tone="emerald"
            size="sm"
          >
            <ActionFieldRolesPanel actionId={actionId} />
          </CmmDisclosure>

          <VolunteerRegistrationPanel
            form={form}
            updateField={updateField}
            userMetadata={userMetadata}
            showGroupJoinHelp={showGroupJoinHelp}
            onToggleGroupJoinHelp={onToggleGroupJoinHelp}
            invitationStatuses={invitationStatuses}
            embedded
          />
        </div>
      </CmmDisclosure>

      <CmmDisclosure
        id="team-logistics-equipment"
        open={openDisclosures.equipment}
        onToggle={(open) => toggleDisclosure("equipment", open)}
        summary={<ActionFormDisclosureSummary label="Matériel et équipements" detail={`${form.suggestedMaterials.length} suggestion${form.suggestedMaterials.length === 1 ? "" : "s"} à apporter · ${equipmentLinesCount} donnée${equipmentLinesCount === 1 ? "" : "s"} d’inventaire renseignée${equipmentLinesCount === 1 ? "" : "s"}`} />}
        tone="emerald"
        size="md"
      >
        <PreparationEquipmentFields form={form} updateField={updateField} />
      </CmmDisclosure>

      <CmmDisclosure
        id="team-logistics-safety"
        open={openDisclosures.safety}
        onToggle={(open) => toggleDisclosure("safety", open)}
        summary={<ActionFormDisclosureSummary label="Sécurité et accessibilité" detail={`${form.safetyInstructions.trim() ? "Consignes particulières renseignées" : "Aucune consigne particulière saisie"} · Accessibilité : ${ACCESSIBILITY_STATUS_LABELS[form.accessibilityStatus]}`} />}
        tone="emerald"
        size="md"
      >
        <div className="space-y-5">
          <section aria-labelledby="before-collection-risk-group" className="space-y-3">
            <h3 id="before-collection-risk-group" className="text-base font-black text-emerald-950">Déchets et risques de collecte</h3>
            <ActionSafetyGuide
              categories={form.wasteCategories}
              schoolContextConfirmed={form.schoolContextConfirmed}
              headingLevel={4}
            />
            <PreparationSecurityFields form={form} updateField={updateField} showGuide={false} />
          </section>
          <section aria-labelledby="before-terrain-group" className="space-y-3 border-t border-emerald-100 pt-4">
            <h3 id="before-terrain-group" className="text-base font-black text-emerald-950">Terrain</h3>
            <p role="note" className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm leading-6 text-amber-950">{terrainGuidance}</p>
          </section>
          <section aria-labelledby="before-supervision-group" className="space-y-3 border-t border-emerald-100 pt-4">
            <h3 id="before-supervision-group" className="text-base font-black text-emerald-950">Encadrement</h3>
            <p role="note" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-800">
              Identifier le référent à prévenir et le point de regroupement. En cas d’incident, appliquer les consignes du guide ; le nombre de personnes présentes n’est pas déduit de l’effectif prévu.
            </p>
            {terrainInterventionMode === "multi_zone" ? (
              <p role="note" className="rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-sm leading-6 text-indigo-950">
                Pour plusieurs groupes, convenir d’un référent joignable et d’un point de regroupement pour chacun, selon l’organisation retenue. Aucun effectif ni nombre de groupes n’est supposé.
              </p>
            ) : null}
          </section>
          <section aria-labelledby="before-accessibility-group" className="space-y-3 border-t border-emerald-100 pt-4">
            <h3 id="before-accessibility-group" className="text-base font-black text-emerald-950">Accessibilité</h3>
            <PreparationAccessibilityFields form={form} updateField={updateField} validationIssueFields={validationIssueFields} />
          </section>
        </div>
      </CmmDisclosure>

      <CmmDisclosure
        id="team-logistics-flow"
        open={openDisclosures.logistics}
        onToggle={(open) => toggleDisclosure("logistics", open)}
        summary={<ActionFormDisclosureSummary label="Logistique et déroulement" detail={`${interventionModeLabel} · checklist : ${completedChecklistCount}/${form.preparationChecklist.length} éléments cochés · ${expectedWasteCount} catégorie${expectedWasteCount === 1 ? "" : "s"} de déchets attendue${expectedWasteCount === 1 ? "" : "s"}`} />}
        tone="emerald"
        size="md"
      >
        <div className="space-y-5">
          <PreparationPlanningFields
            form={form}
            updateField={updateField}
            validationIssueFields={validationIssueFields}
            embedded
          />
          <section aria-labelledby="before-logistics-group" className="space-y-3 border-t border-emerald-100 pt-4">
            <h3 id="before-logistics-group" className="text-base font-black text-emerald-950">Checklist et notes logistiques</h3>
            <PreparationChecklistFields form={form} updateField={updateField} />
            <PreparationLogisticsNotesFields form={form} updateField={updateField} />
          </section>
        </div>
      </CmmDisclosure>
    </div>
  );
}

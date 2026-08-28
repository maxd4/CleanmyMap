"use client";

import { Clock3, ClipboardList, PencilLine, Sparkles } from "lucide-react";
import { PLACE_TYPE_FORM_OPTIONS } from "@/lib/actions/place-type-options";
import {
  ASSOCIATION_SELECTION_OPTIONS,
  ENTREPRISE_ASSOCIATION_OPTION,
} from "@/lib/actions/association-options";
import { CmmCard } from "@/components/ui/cmm-card";
import type { FormState } from "../form/model";
import { ActionParticipantPicker } from "../../action-participant-picker";
import { WasteCategorySelector, WasteFieldSummary } from "@/components/waste/waste-category-selector";
import {
  CREATOR_ROLE_OPTIONS,
  DIFFICULTY_OPTIONS,
  PLANNED_OBJECTIVE_OPTIONS,
  PREPARATION_STATE_OPTIONS,
  type BeforeActionFieldUpdater,
} from "./model";
import { FieldShell, GroupJoinPublishCard, SectionLabel, SelectShell } from "./ui";

type BaseSectionProps = {
  form: FormState;
  updateField: BeforeActionFieldUpdater;
};

type IdentityAndSharingSectionProps = BaseSectionProps & {
  actorNameOptions: string[];
  userMetadata: { userId: string };
  showGroupJoinHelp: boolean;
  onToggleGroupJoinHelp: () => void;
};

export function IdentityAndSharingSection({
  form,
  updateField,
  actorNameOptions,
  userMetadata,
  showGroupJoinHelp,
  onToggleGroupJoinHelp,
}: IdentityAndSharingSectionProps) {
  return (
            <CmmCard tone="emerald" variant="glass" size="lg" className="border-emerald-200/80 bg-white/95">
              <div className="space-y-6">
                <SectionLabel
                  icon={ClipboardList}
                  title="Identité et partage"
                  subtitle="Qui porte le formulaire, dans quel cadre, et si le groupe peut rejoindre l'action."
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FieldShell label="Référent ou créateur">
                    <select
                      value={form.actorName}
                      onChange={(event) => updateField("actorName", event.target.value)}
                      className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                    >
                      {actorNameOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </FieldShell>

                  <FieldShell label="Structure ou cadre">
                    <select
                      value={form.associationName}
                      onChange={(event) => updateField("associationName", event.target.value)}
                      className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                    >
                      {ASSOCIATION_SELECTION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </FieldShell>

                  {form.associationName === ENTREPRISE_ASSOCIATION_OPTION ? (
                    <FieldShell label="Nom de l'entreprise" hint="Utilisé pour nommer le cadre d'engagement.">
                      <input
                        type="text"
                        value={form.enterpriseName}
                        onChange={(event) => {
                          const enterpriseName = event.target.value;
                          updateField("enterpriseName", enterpriseName);
                        }}
                        className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                        placeholder="Ex. Veolia"
                        maxLength={100}
                      />
                    </FieldShell>
                  ) : null}

                  <SelectShell
                    label="Rôle du créateur"
                    value={form.creatorRole}
                    onChange={(value) => updateField("creatorRole", value as FormState["creatorRole"])}
                    options={CREATOR_ROLE_OPTIONS}
                  />

                  <SelectShell
                    label="Statut du formulaire"
                    value={form.preparationState}
                    onChange={(value) =>
                      updateField("preparationState", value as FormState["preparationState"])
                    }
                    options={PREPARATION_STATE_OPTIONS}
                  />
                </div>

                <ActionParticipantPicker
                  currentUserId={userMetadata.userId}
                  value={form.participantAccounts}
                  onChange={(next) => updateField("participantAccounts", next)}
                  description="Ajoutez des membres connus avant de publier le pré-formulaire ou de passer au formulaire complet."
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

export function PlannedActionSection({ form, updateField }: BaseSectionProps) {
  return (
            <CmmCard tone="emerald" variant="glass" size="lg" className="border-emerald-200/80 bg-white/95">
              <div className="space-y-4">
                <SectionLabel
                  icon={Sparkles}
                  title="Action prévue"
                  subtitle="Le contenu nécessaire avant le terrain, sans les champs de récolte réelle."
                />

                <div className="space-y-4">
                  <FieldShell label="Titre de l'action" hint="Nom affiché dans le formulaire de groupe.">
                    <input
                      type="text"
                      value={form.actionTitle}
                      onChange={(event) => updateField("actionTitle", event.target.value)}
                      className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                      placeholder="Ex. Nettoyage des berges de la Seine"
                    />
                  </FieldShell>

                  <FieldShell label="Description courte" hint="Quelques lignes pour expliquer le contexte.">
                    <textarea
                      value={form.shortDescription}
                      onChange={(event) => updateField("shortDescription", event.target.value)}
                      className="min-h-[118px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                      placeholder="Ex. Préparation d'une action de collecte et repérage du site..."
                    />
                  </FieldShell>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldShell label="Commune ou zone concernée" hint="Ville, quartier ou secteur principal.">
                      <input
                        type="text"
                        value={form.communeZoneLabel}
                        onChange={(event) => updateField("communeZoneLabel", event.target.value)}
                        className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                        placeholder="Ex. Paris 15e, berges nord"
                      />
                    </FieldShell>

                  <FieldShell
                      label="Point de rendez-vous précis"
                      hint="Adresse, entrée ou repère exact avant le départ."
                    >
                      <input
                        type="text"
                        value={form.departureLocationLabel}
                        onChange={(event) => updateField("departureLocationLabel", event.target.value)}
                        className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                        placeholder="Ex. Entrée principale, côté métro"
                      />
                    </FieldShell>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldShell
                      label="Zone cible prévue"
                      hint="Périmètre visé en quelques mots."
                    >
                      <input
                        type="text"
                        value={form.arrivalLocationLabel}
                        onChange={(event) => updateField("arrivalLocationLabel", event.target.value)}
                        className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                        placeholder="Ex. Parc rive gauche, quais nord"
                      />
                    </FieldShell>

                    <FieldShell
                      label="Nombre de bénévoles attendus"
                      hint="Estimation avant départ, pas le nombre final."
                    >
                      <input
                        type="number"
                        min="0"
                        value={form.volunteersCount}
                        onChange={(event) => updateField("volunteersCount", event.target.value)}
                        className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                        placeholder="8"
                      />
                    </FieldShell>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldShell
                      label="Localisation du rendez-vous"
                      hint="Facultatif si l'adresse suffit."
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          type="number"
                          step="any"
                          value={form.latitude}
                          onChange={(event) => updateField("latitude", event.target.value)}
                          className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                          placeholder="Latitude"
                        />
                        <input
                          type="number"
                          step="any"
                          value={form.longitude}
                          onChange={(event) => updateField("longitude", event.target.value)}
                          className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                          placeholder="Longitude"
                        />
                      </div>
                    </FieldShell>

                    <FieldShell
                      label="Message pour les participants"
                      hint="Visible par les personnes qui rejoignent le formulaire de groupe."
                    >
                      <textarea
                        value={form.participantMessage}
                        onChange={(event) => updateField("participantMessage", event.target.value)}
                        className="min-h-[132px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                        placeholder="Ex. Merci d'arriver 10 minutes avant, prévoir des chaussures fermées."
                      />
                    </FieldShell>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <FieldShell label="Date prévue">
                      <input
                        type="date"
                        value={form.actionDate}
                        onChange={(event) => updateField("actionDate", event.target.value)}
                        className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                      />
                    </FieldShell>

                    <FieldShell label="Heure de rendez-vous">
                      <input
                        type="time"
                        value={form.meetingTime}
                        onChange={(event) => updateField("meetingTime", event.target.value)}
                        className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                      />
                    </FieldShell>

                    <FieldShell label="Heure de départ prévue">
                      <input
                        type="time"
                        value={form.departureTime}
                        onChange={(event) => updateField("departureTime", event.target.value)}
                        className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                      />
                    </FieldShell>

                    <FieldShell label="Durée estimée" hint="Estimation avant départ.">
                      <div className="relative">
                        <Clock3 size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700/45" />
                        <input
                          type="number"
                          min="0"
                          value={form.durationMinutes}
                          onChange={(event) => updateField("durationMinutes", event.target.value)}
                          className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] py-3 pl-10 pr-4 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                          placeholder="60"
                        />
                      </div>
                    </FieldShell>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectShell
                      label="Type d'action prévue"
                      value={form.plannedObjective}
                      onChange={(value) => updateField("plannedObjective", value as FormState["plannedObjective"])}
                      options={PLANNED_OBJECTIVE_OPTIONS}
                    />

                    <SelectShell
                      label="Type de zone"
                      value={form.placeType}
                      onChange={(value) => updateField("placeType", value)}
                      options={PLACE_TYPE_FORM_OPTIONS.map((option) => ({
                        value: option.value,
                        label: option.label,
                      }))}
                    />

                    <SelectShell
                      label="Niveau de difficulté estimé"
                      value={form.estimatedDifficulty}
                      onChange={(value) =>
                        updateField("estimatedDifficulty", value as FormState["estimatedDifficulty"])
                      }
                      options={DIFFICULTY_OPTIONS}
                    />
                  </div>

                  <ExpectedWasteSection form={form} updateField={updateField} />
                </div>
              </div>
            </CmmCard>
  );
}

export function ExpectedWasteSection({ form, updateField }: BaseSectionProps) {
  return (
    <div className="rounded-[1.5rem] border border-emerald-200/70 bg-[#F3FBF6] p-4">
      <p className="mb-4 text-sm font-black text-emerald-950">Déchets attendus</p>
      <WasteCategorySelector
        value={form.wasteCategories ?? []}
        onChange={(value) => updateField("wasteCategories", value)}
        idPrefix="expected-waste"
      />
      <WasteFieldSummary value={form.wasteCategories ?? []} className="mt-4" />
    </div>
  );
}

export function PreparationAndSafetySection({ form, updateField }: BaseSectionProps) {
  return (
          <CmmCard tone="emerald" variant="glass" size="lg" className="border-emerald-200/80 bg-white/95">
            <div className="space-y-4">
              <SectionLabel
                icon={PencilLine}
                title="Préparation et sécurité"
                subtitle="Consignes, matériel et accessibilité avant publication."
              />

              <div className="grid gap-4 lg:grid-cols-2">
                <FieldShell label="Accessibilité">
                  <textarea
                    value={form.accessibility}
                    onChange={(event) => updateField("accessibility", event.target.value)}
                    className="min-h-[132px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                    placeholder="Ex. Accessible PMR partiellement, escalier à éviter..."
                  />
                </FieldShell>

                <FieldShell label="Consignes de sécurité">
                  <textarea
                    value={form.safetyInstructions}
                    onChange={(event) => updateField("safetyInstructions", event.target.value)}
                    className="min-h-[132px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                    placeholder="Ex. Ne pas traverser la voie ferrée, rester en groupe, gilets visibles..."
                  />
                </FieldShell>
              </div>

                <FieldShell label="Matériel conseillé">
                  <textarea
                    value={form.recommendedMaterials}
                    onChange={(event) => updateField("recommendedMaterials", event.target.value)}
                    className="min-h-[132px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                    placeholder="Ex. Gants, sacs, pinces, chasubles, eau..."
                  />
                </FieldShell>

                <FieldShell label="Commentaire logistique">
                  <textarea
                    value={form.logisticsNotes}
                    onChange={(event) => updateField("logisticsNotes", event.target.value)}
                    className="min-h-[132px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                    placeholder="Ex. Accès, transport, météo à surveiller, lieu de repli, risques connus..."
                  />
                </FieldShell>

                <FieldShell label="Checklist avant départ">
                  <textarea
                    value={form.checklistBeforeDeparture}
                    onChange={(event) => updateField("checklistBeforeDeparture", event.target.value)}
                    className="min-h-[132px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                    placeholder="Ex. Matériel prêt, groupe informé, point de rendez-vous confirmé, sécurité rappelée."
                  />
                </FieldShell>

                <div className="rounded-[1.5rem] border border-emerald-200/70 bg-[#ECF8EF] px-4 py-3 text-sm leading-6 text-emerald-950">
                  <span className="font-bold">Bon à savoir.</span> Ce pré-formulaire ne comprend pas de
                tracé GPS, de récolte réelle, de photos de collecte, de bilan final ni de score d&apos;impact.
              </div>
            </div>
          </CmmCard>
  );
}

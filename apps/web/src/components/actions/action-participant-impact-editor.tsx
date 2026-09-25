"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmField, CmmInput, CmmSelect } from "@/components/ui/cmm-field";
import type { ActionParticipationReviewItem } from "@/lib/actions/participation/group-participation";

type Props = {
  actionId: string;
  participants: ActionParticipationReviewItem[];
  fr: boolean;
  onSaved: () => void;
};

type Draft = {
  mode: "automatic" | "individual";
  wasteKg: string;
  wasteCondition: "sec" | "humide" | "mouille";
  wasteMeasurementMethod: string;
  buttsCount: string;
  buttsMassKg: string;
  buttsCondition: "propre" | "humide" | "mouille";
};

const EMPTY_DRAFT: Omit<Draft, "mode"> = {
  wasteKg: "",
  wasteCondition: "sec",
  wasteMeasurementMethod: "balance_au_sol",
  buttsCount: "",
  buttsMassKg: "",
  buttsCondition: "propre",
};

function draftFromParticipant(participant: ActionParticipationReviewItem): Draft {
  const measurement = participant.individualImpact;
  return {
    mode: measurement ? "individual" : "automatic",
    wasteKg: measurement?.wasteKg === null || measurement?.wasteKg === undefined ? "" : String(measurement.wasteKg),
    wasteCondition: measurement?.wasteCondition ?? "sec",
    wasteMeasurementMethod: measurement?.wasteMeasurementMethod ?? EMPTY_DRAFT.wasteMeasurementMethod,
    buttsCount: measurement?.cigaretteButtsCount === null || measurement?.cigaretteButtsCount === undefined ? "" : String(measurement.cigaretteButtsCount),
    buttsMassKg: measurement?.cigaretteButtsMassKg === null || measurement?.cigaretteButtsMassKg === undefined ? "" : String(measurement.cigaretteButtsMassKg),
    buttsCondition: measurement?.cigaretteButtsCondition ?? "propre",
  };
}

function formatNumber(value: number | null, fr: boolean, maximumFractionDigits = 2): string {
  return value === null ? "NA" : value.toLocaleString(fr ? "fr-FR" : "en-US", { maximumFractionDigits });
}

function parseDraft(draft: Draft, fr: boolean) {
  const wasteKg = draft.wasteKg.trim() === "" ? null : Number(draft.wasteKg);
  const buttsCount = draft.buttsCount.trim() === "" ? null : Number(draft.buttsCount);
  const buttsMassKg = draft.buttsMassKg.trim() === "" ? null : Number(draft.buttsMassKg);
  const hasWaste = wasteKg !== null;
  const hasButts = buttsCount !== null || buttsMassKg !== null;
  if ((hasWaste && !Number.isFinite(wasteKg)) || (hasButts && (!Number.isFinite(buttsCount ?? 0) || !Number.isFinite(buttsMassKg ?? 0)))) {
    return { error: fr ? "Les mesures doivent être numériques." : "Measurements must be numeric." };
  }
  if (!hasWaste && !hasButts) {
    return { error: fr ? "Renseignez au moins une mesure, ou repassez en quote-part automatique." : "Enter at least one measurement, or switch back to automatic share." };
  }
  return { wasteKg, buttsCount, buttsMassKg, hasWaste, hasButts };
}

async function persistImpactMeasurement(
  actionId: string,
  participantId: string,
  draft: Draft,
  fr: boolean,
): Promise<string | null> {
  const parsed = parseDraft(draft, fr);
  if ("error" in parsed && parsed.error) return parsed.error;
  const { wasteKg, buttsCount, buttsMassKg, hasWaste, hasButts } = parsed;
  try {
    const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/participant-impact`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId,
        waste: hasWaste ? { kg: wasteKg, condition: draft.wasteCondition, measurementMethod: draft.wasteMeasurementMethod } : null,
        butts: hasButts ? { count: buttsCount, massKg: buttsMassKg, condition: draft.buttsCondition } : null,
      }),
    });
    const payload = (await response.json()) as { error?: string };
    return response.ok ? null : payload.error || (fr ? "La mesure n’a pas été enregistrée." : "The measurement was not saved.");
  } catch (error) {
    return error instanceof Error ? error.message : (fr ? "La mesure n’a pas été enregistrée." : "The measurement was not saved.");
  }
}

async function clearImpactMeasurement(actionId: string, participantId: string, fr: boolean): Promise<string | null> {
  try {
    const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/participant-impact`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, waste: null, butts: null }),
    });
    const payload = (await response.json()) as { error?: string };
    return response.ok ? null : payload.error || (fr ? "La quote-part n’a pas été rétablie." : "The automatic share was not restored.");
  } catch (error) {
    return error instanceof Error ? error.message : (fr ? "La quote-part n’a pas été rétablie." : "The automatic share was not restored.");
  }
}

function ImpactMeasurementSummary({
  measurement,
  fr,
}: {
  measurement: ActionParticipationReviewItem["individualImpact"];
  fr: boolean;
}) {
  if (!measurement) return null;
  return (
    <div className="mt-2 grid gap-1 text-xs text-slate-700">
      {measurement.wasteKg !== null ? <p>Déchets : {formatNumber(measurement.wasteKg, fr)} kg brut · {measurement.wasteCondition ?? "condition inconnue"} · {formatNumber(measurement.equivalentSecKg, fr)} kg équivalent sec</p> : null}
      {measurement.cigaretteButtsCount !== null || measurement.cigaretteButtsMassKg !== null ? <p>Mégots : {measurement.cigaretteButtsCount !== null ? `${formatNumber(measurement.cigaretteButtsCount, fr, 0)} comptés` : `${formatNumber(measurement.cigaretteButtsMassKg, fr, 3)} kg brut`} · {measurement.cigaretteButtsCondition ?? "condition inconnue"} · {formatNumber(measurement.comparableButtsCount, fr, 0)} comparables ({measurement.comparableButtsProvenance ?? "NA"})</p> : null}
    </div>
  );
}

function ImpactAutomaticControls({ fr, setDraft }: { fr: boolean; setDraft: Dispatch<SetStateAction<Draft>> }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <p className="text-xs text-slate-600">{fr ? "Cette personne participe au reliquat conservatif." : "This person receives the conservative remainder."}</p>
      <CmmButton type="button" tone="secondary" variant="pill" size="sm" onClick={() => setDraft((current) => ({ ...current, mode: "individual" }))}>
        {fr ? "Saisir une mesure" : "Enter a measurement"}
      </CmmButton>
    </div>
  );
}

function ImpactIndividualForm({
  draft,
  fr,
  error,
  saving,
  setDraft,
  save,
  switchToAutomatic,
}: {
  draft: Draft;
  fr: boolean;
  error: string | null;
  saving: boolean;
  setDraft: Dispatch<SetStateAction<Draft>>;
  save: () => void;
  switchToAutomatic: () => void;
}) {
  return (
    <div className="mt-3 space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <CmmField label={fr ? "Déchets bruts (kg)" : "Raw waste (kg)"} hint={fr ? "Laissez vide si non mesuré." : "Leave empty if not measured."}>
          <CmmInput type="number" min="0" step="0.001" value={draft.wasteKg} onChange={(event) => setDraft((current) => ({ ...current, wasteKg: event.target.value }))} />
        </CmmField>
        <CmmField label={fr ? "Condition déchets" : "Waste condition"}>
          <CmmSelect value={draft.wasteCondition} onChange={(event) => setDraft((current) => ({ ...current, wasteCondition: event.target.value as Draft["wasteCondition"] }))}>
            <option value="sec">Sec</option><option value="humide">Humide</option><option value="mouille">Mouillé</option>
          </CmmSelect>
        </CmmField>
        <CmmField label={fr ? "Méthode" : "Method"}>
          <CmmSelect value={draft.wasteMeasurementMethod} onChange={(event) => setDraft((current) => ({ ...current, wasteMeasurementMethod: event.target.value }))}>
            <option value="balance_au_sol">Balance au sol</option><option value="balance_suspendue">Balance suspendue</option><option value="estimation_visuelle">Estimation visuelle</option><option value="autre">Autre</option><option value="inconnue">Inconnue</option>
          </CmmSelect>
        </CmmField>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <CmmField label={fr ? "Mégots comptés" : "Counted butts"} hint={fr ? "Le comptage prime sur la masse." : "A count takes precedence over mass."}>
          <CmmInput type="number" min="0" step="1" value={draft.buttsCount} onChange={(event) => setDraft((current) => ({ ...current, buttsCount: event.target.value }))} />
        </CmmField>
        <CmmField label={fr ? "Masse mégots (kg)" : "Butt mass (kg)"}>
          <CmmInput type="number" min="0" step="0.001" value={draft.buttsMassKg} onChange={(event) => setDraft((current) => ({ ...current, buttsMassKg: event.target.value }))} />
        </CmmField>
        <CmmField label={fr ? "Condition mégots" : "Butt condition"}>
          <CmmSelect value={draft.buttsCondition} onChange={(event) => setDraft((current) => ({ ...current, buttsCondition: event.target.value as Draft["buttsCondition"] }))}>
            <option value="propre">Propre</option><option value="humide">Humide</option><option value="mouille">Mouillé</option>
          </CmmSelect>
        </CmmField>
      </div>
      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <CmmButton type="button" tone="primary" variant="pill" size="sm" loading={saving} onClick={save}>
          {fr ? "Enregistrer la mesure" : "Save measurement"}
        </CmmButton>
        <CmmButton type="button" tone="secondary" variant="pill" size="sm" disabled={saving} onClick={switchToAutomatic}>
          {fr ? "Repasser en quote-part" : "Restore automatic share"}
        </CmmButton>
      </div>
    </div>
  );
}

function ActionParticipantImpactEditorBody({
  measurement,
  draft,
  fr,
  error,
  saving,
  setDraft,
  save,
  switchToAutomatic,
}: {
  measurement: ActionParticipationReviewItem["individualImpact"];
  draft: Draft;
  fr: boolean;
  error: string | null;
  saving: boolean;
  setDraft: Dispatch<SetStateAction<Draft>>;
  save: () => void;
  switchToAutomatic: () => void;
}) {
  return (
    <>
      <ImpactMeasurementSummary measurement={measurement} fr={fr} />
      {draft.mode === "automatic" ? (
        <ImpactAutomaticControls fr={fr} setDraft={setDraft} />
      ) : (
        <ImpactIndividualForm draft={draft} fr={fr} error={error} saving={saving} setDraft={setDraft} save={save} switchToAutomatic={switchToAutomatic} />
      )}
    </>
  );
}

function ActionParticipantImpactEditorHeader({
  participant,
  measurement,
  draft,
  fr,
}: {
  participant: ActionParticipationReviewItem;
  measurement: ActionParticipationReviewItem["individualImpact"];
  draft: Draft;
  fr: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <p className="text-sm font-semibold text-slate-900">{participant.displayName}</p>
        <p className="text-xs text-slate-600">
          {participant.handle ? `@${participant.handle}` : participant.displayName}
          {measurement?.measuredAt ? ` · ${new Date(measurement.measuredAt).toLocaleDateString(fr ? "fr-FR" : "en-US")}` : ""}
        </p>
      </div>
      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-bold uppercase tracking-[0.12em] text-amber-800">
        {draft.mode === "individual" ? (fr ? "Mesure individuelle" : "Individual measurement") : (fr ? "Quote-part automatique" : "Automatic share")}
      </span>
    </div>
  );
}

function ActionParticipantImpactEditorRow({
  actionId,
  participant,
  fr,
  onSaved,
}: {
  actionId: string;
  participant: ActionParticipationReviewItem;
  fr: boolean;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFromParticipant(participant));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const saveError = await persistImpactMeasurement(actionId, participant.id, draft, fr);
    if (saveError) {
      setError(saveError);
    } else {
      setDraft((current) => ({ ...current, mode: "individual" }));
      onSaved();
    }
    setSaving(false);
  }

  async function switchToAutomatic() {
    setSaving(true);
    setError(null);
    const clearError = await clearImpactMeasurement(actionId, participant.id, fr);
    if (clearError) {
      setError(clearError);
    } else {
      setDraft((current) => ({ ...current, mode: "automatic" }));
      onSaved();
    }
    setSaving(false);
  }

  const measurement = participant.individualImpact;

  return (
    <div className="rounded-lg border border-amber-100 bg-white px-3 py-3">
      <ActionParticipantImpactEditorHeader participant={participant} measurement={measurement} draft={draft} fr={fr} />

      <ActionParticipantImpactEditorBody
        measurement={measurement}
        draft={draft}
        fr={fr}
        error={error}
        saving={saving}
        setDraft={setDraft}
        save={() => void save()}
        switchToAutomatic={() => void switchToAutomatic()}
      />
    </div>
  );
}

export function ActionParticipantImpactEditor({ actionId, participants, fr, onSaved }: Props) {
  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
      <div>
        <p className="cmm-text-caption font-semibold uppercase tracking-wide text-amber-800">
          {fr ? "Attribution individuelle de l’impact" : "Individual impact attribution"}
        </p>
        <p className="mt-1 cmm-text-small cmm-text-secondary">
          {fr ? "Les mesures ne concernent que les participations confirmées. Les valeurs brutes sont conservées ; la conversion humide est réservée à la gamification." : "Measurements apply only to confirmed participations. Raw values are preserved; moisture conversion is reserved for gamification."}
        </p>
      </div>
      {participants.length > 0 ? (
        <div className="mt-3 space-y-2.5">
          {participants.map((participant) => (
            <ActionParticipantImpactEditorRow key={`${participant.id}-${participant.individualImpact?.measuredAt ?? "none"}`} actionId={actionId} participant={participant} fr={fr} onSaved={onSaved} />
          ))}
        </div>
      ) : (
        <p className="mt-2 rounded-lg border border-dashed border-amber-200 bg-white/80 px-3 py-2.5 cmm-text-small cmm-text-secondary">
          {fr ? "Aucune participation confirmée." : "No confirmed participation."}
        </p>
      )}
    </div>
  );
}

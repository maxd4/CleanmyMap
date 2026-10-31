"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmField, CmmInput, CmmSelect } from "@/components/ui/cmm-field";
import type { ActionParticipationReviewItem } from "@/lib/actions/participation/group-participation";
import { aggregateCigaretteButtsLots, type CigaretteButtsLotInput, type CigaretteButtsLotSource } from "@/lib/waste/cigarette-butts";

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
  buttsLots: DraftButtsLot[] | null;
};

type DraftButtsLot = {
  id: string;
  source: CigaretteButtsLotSource;
  value: string;
  condition: "propre" | "humide" | "mouille";
};

const EMPTY_DRAFT: Omit<Draft, "mode"> = {
  wasteKg: "",
  wasteCondition: "sec",
  wasteMeasurementMethod: "balance_au_sol",
  buttsCount: "",
  buttsMassKg: "",
  buttsCondition: "propre",
  buttsLots: null,
};

function createLotDraft(): DraftButtsLot {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `lot-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    source: "count",
    value: "",
    condition: "propre",
  };
}

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
    buttsLots: measurement?.cigaretteButtsLots?.lots.map((lot) => ({
      id: lot.id,
      source: lot.source,
      value: String(lot.value),
      condition: lot.condition,
    })) ?? null,
  };
}

function formatNumber(value: number | null, fr: boolean, maximumFractionDigits = 2): string {
  return value === null ? "NA" : value.toLocaleString(fr ? "fr-FR" : "en-US", { maximumFractionDigits });
}

function parseDraft(draft: Draft, fr: boolean) {
  const wasteKg = draft.wasteKg.trim() === "" ? null : Number(draft.wasteKg);
  if (draft.buttsLots !== null) {
    const lots: CigaretteButtsLotInput[] = [];
    for (const lot of draft.buttsLots) {
      const value = lot.value.trim() === "" ? null : Number(lot.value);
      if (value === null || !Number.isFinite(value) || value < 0 || (lot.source === "count" && !Number.isInteger(value))) {
        return { error: fr ? "Chaque lot doit avoir une valeur valide." : "Each lot must have a valid value." };
      }
      lots.push({ id: lot.id, source: lot.source, value, condition: lot.condition });
    }
    if (draft.buttsLots.length === 0 && (draft.buttsCount.trim() !== "" || draft.buttsMassKg.trim() !== "")) {
      return { error: fr ? "L’ancienne mesure est ambiguë : choisissez explicitement la source du lot." : "The legacy measurement is ambiguous: explicitly choose the lot source." };
    }
    const hasWaste = wasteKg !== null;
    if ((hasWaste && !Number.isFinite(wasteKg)) || (draft.buttsLots.length > 0 && aggregateCigaretteButtsLots(lots).lots.length !== lots.length)) {
      return { error: fr ? "Les mesures doivent être numériques et les identifiants de lots distincts." : "Measurements must be numeric and lot identifiers must be distinct." };
    }
    if (!hasWaste && lots.length === 0) {
      return { error: fr ? "Renseignez au moins une mesure, ou repassez en quote-part automatique." : "Enter at least one measurement, or switch back to automatic share." };
    }
    return { wasteKg, buttsLots: lots, buttsCount: null, buttsMassKg: null, hasWaste, hasButts: lots.length > 0 };
  }
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
  return { wasteKg, buttsCount, buttsMassKg, buttsLots: null, hasWaste, hasButts };
}

async function persistImpactMeasurement(
  actionId: string,
  participantId: string,
  draft: Draft,
  fr: boolean,
): Promise<string | null> {
  const parsed = parseDraft(draft, fr);
  if ("error" in parsed && parsed.error) return parsed.error;
  const { wasteKg, buttsCount, buttsMassKg, buttsLots, hasWaste, hasButts } = parsed;
  try {
    const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/participant-impact`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId,
        waste: hasWaste ? { kg: wasteKg, condition: draft.wasteCondition, measurementMethod: draft.wasteMeasurementMethod } : null,
        butts: hasButts
          ? buttsLots
            ? { lots: buttsLots }
            : { count: buttsCount, massKg: buttsMassKg, condition: draft.buttsCondition }
          : null,
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
      {measurement.cigaretteButtsLots ? (
        <div>
          <p>Mégots : {measurement.cigaretteButtsLots.lots.length} lot(s) · {formatNumber(measurement.cigaretteButtsLots.summary.totalCount, fr, 0)} comparables · {measurement.cigaretteButtsLots.summary.estimatedCount > 0 ? "part estimée" : "comptés"}</p>
          <p className="pl-3 text-slate-600">{measurement.cigaretteButtsLots.results.map((lot) => `${lot.source === "count" ? `${formatNumber(lot.value, fr, 0)} comptés` : lot.source === "mass_kg" ? `${formatNumber(lot.value, fr, 3)} kg brut` : `${formatNumber(lot.value, fr, 3)} L brut`} → ${formatNumber(lot.count, fr, 0)} · ${lot.condition}`).join(" · ")}</p>
        </div>
      ) : measurement.cigaretteButtsCount !== null || measurement.cigaretteButtsMassKg !== null ? <p>Mégots : {measurement.cigaretteButtsCount !== null ? `${formatNumber(measurement.cigaretteButtsCount, fr, 0)} comptés` : `${formatNumber(measurement.cigaretteButtsMassKg, fr, 3)} kg brut`} · {measurement.cigaretteButtsCondition ?? "condition inconnue"} · {formatNumber(measurement.comparableButtsCount, fr, 0)} comparables ({measurement.comparableButtsProvenance ?? "NA"})</p> : null}
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
  function startLots() {
    setDraft((current) => ({ ...current, buttsLots: [] }));
  }

  function addLot() {
    setDraft((current) => ({ ...current, buttsLots: [...(current.buttsLots ?? []), createLotDraft()] }));
  }

  function updateLot(id: string, update: Partial<DraftButtsLot>) {
    setDraft((current) => ({
      ...current,
      buttsLots: (current.buttsLots ?? []).map((lot) => lot.id === id ? { ...lot, ...update } : lot),
    }));
  }

  function removeLot(id: string) {
    setDraft((current) => ({ ...current, buttsLots: (current.buttsLots ?? []).filter((lot) => lot.id !== id) }));
  }

  function moveLot(id: string, direction: -1 | 1) {
    setDraft((current) => {
      const lots = [...(current.buttsLots ?? [])];
      const index = lots.findIndex((lot) => lot.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= lots.length) return current;
      [lots[index], lots[nextIndex]] = [lots[nextIndex]!, lots[index]!];
      return { ...current, buttsLots: lots };
    });
  }

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
      {draft.buttsLots === null ? (
        <div className="space-y-2">
          <div className="grid gap-3 md:grid-cols-3">
            <CmmField label={fr ? "Mégots comptés" : "Counted butts"} hint={fr ? "Le comptage prime sur la masse pour l’ancienne mesure." : "A count takes precedence for the legacy measurement."}>
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
          <CmmButton type="button" tone="secondary" variant="pill" size="sm" onClick={startLots}>
            {fr ? "Saisir plusieurs lots" : "Enter several lots"}
          </CmmButton>
        </div>
      ) : (
        <div className="space-y-2 rounded-lg border border-amber-100 bg-amber-50/50 p-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-700">{fr ? "Lots de mégots indépendants" : "Independent cigarette-butt lots"}</p>
            <CmmButton type="button" tone="secondary" variant="pill" size="sm" onClick={addLot}>{fr ? "Ajouter un lot" : "Add a lot"}</CmmButton>
          </div>
          {draft.buttsLots.map((lot, index) => (
            <div key={lot.id} className="grid gap-2 rounded-md border border-slate-200 bg-white p-2 md:grid-cols-[1fr_1fr_1fr_auto]">
              <CmmField label={`${fr ? "Lot" : "Lot"} ${index + 1}`}>
                <CmmSelect value={lot.source} onChange={(event) => updateLot(lot.id, { source: event.target.value as CigaretteButtsLotSource })}>
                  <option value="count">{fr ? "Nombre" : "Count"}</option><option value="mass_kg">kg</option><option value="volume_l">{fr ? "Litres" : "Litres"}</option>
                </CmmSelect>
              </CmmField>
              <CmmField label={lot.source === "count" ? (fr ? "Nombre" : "Count") : lot.source === "mass_kg" ? "kg" : "L"}>
                <CmmInput type="number" min="0" step={lot.source === "count" ? "1" : "0.001"} value={lot.value} onChange={(event) => updateLot(lot.id, { value: event.target.value })} />
              </CmmField>
              <CmmField label={fr ? "État" : "Condition"}>
                <CmmSelect value={lot.condition} onChange={(event) => updateLot(lot.id, { condition: event.target.value as DraftButtsLot["condition"] })}>
                  <option value="propre">Propre</option><option value="humide">Humide</option><option value="mouille">Mouillé</option>
                </CmmSelect>
              </CmmField>
              <div className="flex items-end gap-1">
                <CmmButton type="button" tone="secondary" variant="pill" size="sm" aria-label={fr ? "Monter le lot" : "Move lot up"} disabled={index === 0} onClick={() => moveLot(lot.id, -1)}>↑</CmmButton>
                <CmmButton type="button" tone="secondary" variant="pill" size="sm" aria-label={fr ? "Descendre le lot" : "Move lot down"} disabled={index === draft.buttsLots!.length - 1} onClick={() => moveLot(lot.id, 1)}>↓</CmmButton>
                <CmmButton type="button" tone="secondary" variant="pill" size="sm" aria-label={fr ? "Supprimer le lot" : "Delete lot"} onClick={() => removeLot(lot.id)}>×</CmmButton>
              </div>
            </div>
          ))}
          {draft.buttsLots.length === 0 ? <p className="text-xs text-slate-600">{fr ? "Ajoutez un lot pour enregistrer une attribution. Une ancienne paire nombre/masse n’est jamais convertie automatiquement en deux lots." : "Add a lot to save an attribution. A legacy count/mass pair is never automatically converted into two lots."}</p> : null}
          {draft.buttsLots.length > 0 ? (() => {
            const candidateLots = draft.buttsLots.flatMap((lot) => {
              const value = Number(lot.value);
              return Number.isFinite(value) && value >= 0 && (lot.source !== "count" || Number.isInteger(value))
                ? [{ id: lot.id, source: lot.source, value, condition: lot.condition } satisfies CigaretteButtsLotInput]
                : [];
            });
            const summary = aggregateCigaretteButtsLots(candidateLots).summary;
            return <p className="text-xs text-slate-700">{fr ? "Total lots :" : "Lot total:"} {formatNumber(summary.totalCount, fr, 0)} {fr ? "comparables" : "comparable"} · {formatNumber(summary.countedCount, fr, 0)} {fr ? "comptés" : "counted"} · {formatNumber(summary.estimatedCount, fr, 0)} {fr ? "estimés" : "estimated"}</p>;
          })() : null}
        </div>
      )}
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
        save={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ save(); }}
        switchToAutomatic={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ switchToAutomatic(); }}
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

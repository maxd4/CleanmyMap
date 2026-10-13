"use client";

import { useMemo, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmField, CmmInput, CmmTextarea } from "@/components/ui/cmm-field";

type Category = { id: string; code: string; label: string; measurementKind: string; unit: string; isComplete: boolean };
type ExistingItem = { category_rule_id: string; quantity: number | string | null; mass_grams: number | string | null; object_count: number | string | null; measurement_method: string | null; provenance: string; arbitration_comment: string | null };
type TeamForm = {
  event: { name: string; mode: string; state: string; regulation_version: string; regulation_status: string; regulation_source_reference: string | null };
  team: { id: string; teamNumber: number; publicName: string };
  categories: Category[];
  latestSubmission: { id: string; version: number; status: string; correctionReason: string | null; items: ExistingItem[] } | null;
  presentParticipants: number;
  officialScoreAvailable: boolean;
};
type DraftRow = { categoryRuleId: string; measurementKind: string; unit: string; quantity: string; massGrams: string; objectCount: string; measurementMethod: string; provenance: string; arbitrationComment: string };

function createRows(form: TeamForm): DraftRow[] {
  const existing = new Map((form.latestSubmission?.items ?? []).map((item) => [item.category_rule_id, item]));
  return form.categories.map((category) => {
    const item = existing.get(category.id);
    return {
      categoryRuleId: category.id,
      measurementKind: category.measurementKind,
      unit: category.unit,
      quantity: item?.quantity === null || item?.quantity === undefined ? "" : String(item.quantity),
      massGrams: item?.mass_grams === null || item?.mass_grams === undefined ? "" : String(item.mass_grams),
      objectCount: item?.object_count === null || item?.object_count === undefined ? "" : String(item.object_count),
      measurementMethod: item?.measurement_method ?? "",
      provenance: item?.provenance ?? "",
      arbitrationComment: item?.arbitration_comment ?? "",
    };
  });
}

function parseOptionalNumber(value: string): number | null {
  const normalized = value.trim();
  return normalized ? Number(normalized) : null;
}

export function SpogomiTeamResultForm({ form }: { form: TeamForm }) {
  const [rows, setRows] = useState(() => createRows(form));
  const [submissionId, setSubmissionId] = useState(form.latestSubmission?.status === "draft" ? form.latestSubmission.id : null);
  const [correctionReason, setCorrectionReason] = useState(form.latestSubmission?.correctionReason ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const isCorrection = form.latestSubmission?.status === "certified";
  const physicalHint = useMemo(() => form.officialScoreAvailable ? "Le règlement complet est configuré : le score sportif pourra être calculé après certification." : "Le règlement n’est pas complet : les mesures physiques sont enregistrables, mais aucun classement sportif officiel ne sera calculé.", [form.officialScoreAvailable]);

  function updateRow(index: number, field: keyof DraftRow, value: string) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  }

  async function save(status: "draft" | "submitted") {
    setBusy(true); setError(null); setMessage(null);
    try {
      const response = await fetch("/api/spogomi/team-form", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          submissionId,
          idempotencyKey,
          status,
          correctionReason: correctionReason.trim() || null,
          items: rows.map((row) => ({
            categoryRuleId: row.categoryRuleId,
            measurementKind: row.measurementKind,
            unit: row.unit,
            quantity: parseOptionalNumber(row.quantity),
            massGrams: parseOptionalNumber(row.massGrams),
            objectCount: parseOptionalNumber(row.objectCount),
            measurementMethod: row.measurementMethod.trim() || null,
            provenance: row.provenance.trim(),
            arbitrationComment: row.arbitrationComment.trim() || null,
          })),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "La saisie n’a pas été enregistrée.");
      const savedId = body?.submission?.id;
      if (typeof savedId === "string") setSubmissionId(savedId);
      setIdempotencyKey(crypto.randomUUID());
      setMessage(status === "submitted" ? "Résultat soumis. La certification reste réservée à l’organisateur ou à l’arbitre." : "Brouillon enregistré.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La saisie n’a pas été enregistrée.");
    } finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-emerald-50 px-4 py-10"><div className="cmm-page-width space-y-6">
    <CmmCard tone="emerald" variant="glass" className="space-y-3 p-5"><p className="text-sm font-bold uppercase tracking-wide text-emerald-700">SPOGOMI · équipe {form.team.teamNumber}</p><h1 className="text-3xl font-black text-slate-950">{form.team.publicName}</h1><p className="cmm-text-body text-slate-700">{form.event.name} · {form.event.mode === "world_cup" ? "World Cup" : "Casual"}</p><p className="rounded-xl bg-white/70 p-3 text-sm text-slate-700">{physicalHint} La masse reste saisie en grammes. Un nombre d’objets ou de mégots n’est accepté que s’il a réellement été compté ; il n’est jamais déduit d’une masse.</p><p className="text-sm text-slate-900">Participants présents vérifiés par l’organisation : {form.presentParticipants}. Ce formulaire ne demande pas de compte CleanMyMap.</p></CmmCard>
    {message ? <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p> : null}{error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    <div className="space-y-5 text-slate-900">{rows.map((row, index) => { const category = form.categories[index]; return <CmmCard key={row.categoryRuleId} tone="amber" variant="glass" className="space-y-4 p-5"><div><h2 className="text-xl font-black text-slate-950">{category.label}</h2><p className="text-sm text-slate-900">Quantité attendue : {category.unit} · type {category.measurementKind}</p></div><div className="grid gap-4 md:grid-cols-3"><CmmField label={`Quantité (${category.unit})`} required><CmmInput type="number" min="0" step="any" value={row.quantity} onChange={(event) => updateRow(index, "quantity", event.target.value)} /></CmmField><CmmField label="Masse brute (g)" hint="Laissez vide si cette catégorie ne se mesure pas en masse."><CmmInput type="number" min="0" step="0.001" value={row.massGrams} onChange={(event) => updateRow(index, "massGrams", event.target.value)} /></CmmField><CmmField label="Objets réellement comptés" hint="Ne convertissez pas une masse en nombre."><CmmInput type="number" min="0" step="1" value={row.objectCount} onChange={(event) => updateRow(index, "objectCount", event.target.value)} /></CmmField></div><div className="grid gap-4 md:grid-cols-2"><CmmField label="Méthode de mesure" required><CmmInput value={row.measurementMethod} onChange={(event) => updateRow(index, "measurementMethod", event.target.value)} placeholder="Ex. pesée brute, comptage manuel" /></CmmField><CmmField label="Provenance de la mesure" required><CmmInput value={row.provenance} onChange={(event) => updateRow(index, "provenance", event.target.value)} placeholder="Ex. balance poste de tri" /></CmmField></div><CmmField label="Commentaire d’arbitrage" hint="Facultatif ; à compléter si une décision ou une réserve doit être conservée."><CmmTextarea value={row.arbitrationComment} onChange={(event) => updateRow(index, "arbitrationComment", event.target.value)} rows={3} /></CmmField></CmmCard>; })}</div>
    {isCorrection ? <CmmField label="Motif de correction" required hint="Une correction après certification crée une nouvelle version et conserve l’historique."><CmmTextarea value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} rows={3} /></CmmField> : null}
    <div className="flex flex-wrap gap-3"><CmmButton type="button" tone="secondary" disabled={busy} onClick={() => void save("draft")}>Enregistrer le brouillon</CmmButton><CmmButton type="button" tone="primary" disabled={busy} onClick={() => void save("submitted")}>{isCorrection ? "Soumettre la correction" : "Soumettre le résultat"}</CmmButton></div>
  </div></main>;
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import type { SpogomiFieldOperationsCapability } from "@/lib/spogomi/field-operations-service";

type Row = Record<string, unknown>;
type Dashboard = { divisions: Row[]; teams: Row[]; categories: Row[]; operations: Row[]; returns: Row[]; incidents: Row[]; measurements: Row[] };

function text(row: Row, key: string): string { return String(row[key] ?? ""); }
function dateLabel(value: unknown): string { return value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(String(value))) : "—"; }

export function SpogomiFieldOperationsPanel({ eventId, capabilities }: { eventId: string; capabilities: readonly SpogomiFieldOperationsCapability[] }) {
  const capabilitySet = useMemo(() => new Set(capabilities), [capabilities]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [divisionId, setDivisionId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [categoryRuleId, setCategoryRuleId] = useState("");
  const [incidentText, setIncidentText] = useState("");
  const [incidentCategory, setIncidentCategory] = useState("safety");
  const [decisionRule, setDecisionRule] = useState("");
  const [decisionJustification, setDecisionJustification] = useState("");
  const [measurementValue, setMeasurementValue] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/spogomi/events/${eventId}/field-operations`, { cache: "no-store" });
    if (!response.ok) throw new Error("Impossible de charger les opérations terrain.");
    const data = await response.json() as Dashboard;
    setDashboard(data);
    if (!divisionId && data.divisions[0]) setDivisionId(text(data.divisions[0], "id"));
  }, [divisionId, eventId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { refresh().catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Erreur de chargement.")); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function mutate(payload: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/spogomi/events/${eventId}/field-operations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "La décision n’a pas été enregistrée.");
      await refresh();
      setMessage("Décision enregistrée avec sa provenance.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Erreur d’enregistrement."); }
    finally { setBusy(false); }
  }

  if (!dashboard) return <CmmCard tone="emerald" variant="glass" className="p-5">Chargement des opérations terrain…</CmmCard>;
  const teams = dashboard.teams.filter((row) => !divisionId || text(row, "division_id") === divisionId);
  const categories = dashboard.categories.filter((row) => !divisionId || text(row, "division_id") === divisionId);
  const selectedCategory = categories.find((row) => text(row, "id") === categoryRuleId);
  const canMeasure = capabilitySet.has("measurement_entry") || capabilitySet.has("weighing");
  const canArbitrate = capabilitySet.has("arbitration");

  return <div className="space-y-4">
    <CmmCard tone="emerald" variant="glass" className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="cmm-text-h3">Terrain · chronométrage, retours et mesures</h2><p className="text-sm text-slate-700">Les observations, mesures et décisions restent séparées et historisées. Cette vue ne certifie pas un classement.</p></div><CmmButton type="button" tone="secondary" onClick={() => refresh().catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Erreur de chargement."))}>Actualiser</CmmButton></div>
      <label className="grid gap-1 text-sm font-bold text-slate-800">Division<select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" value={divisionId} onChange={(event) => { setDivisionId(event.target.value); setTeamId(""); setCategoryRuleId(""); }}><option value="">Toutes</option>{dashboard.divisions.map((row) => <option key={text(row, "id")} value={text(row, "id")}>{text(row, "division_type")} · règlement {text(row, "regulation_version")}</option>)}</select></label>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><strong>Phases</strong><p>{dashboard.operations.length} configuration(s)</p></div><div><strong>Retours</strong><p>{dashboard.returns.length} équipe(s)</p></div><div><strong>Incidents</strong><p>{dashboard.incidents.filter((row) => text(row, "decision_status") === "open").length} à traiter</p></div><div><strong>Mesures</strong><p>{dashboard.measurements.filter((row) => text(row, "status") !== "certified").length} non certifiée(s)</p></div></div>
    </CmmCard>

    {capabilitySet.has("timing") ? <CmmCard tone="slate" variant="glass" className="space-y-3 p-5"><h3 className="font-black text-slate-900">Phase officielle</h3><div className="flex flex-wrap gap-2">{["collection", "sorting", "weighing", "closed"].map((phase) => <CmmButton key={phase} tone="primary" disabled={!divisionId || busy} onClick={() => { void mutate({ action: "phase", divisionId, phase, at: new Date().toISOString(), reason: "Constat opérationnel du responsable habilité", provenance: "cockpit_terrain" }); }}>{phase}</CmmButton>)}</div><p className="text-xs text-slate-600">L’heure du serveur et la provenance font foi ; l’horloge du navigateur sert seulement à préparer l’action.</p></CmmCard> : null}

    {capabilitySet.has("arrival") ? <CmmCard tone="slate" variant="glass" className="space-y-3 p-5"><h3 className="font-black text-slate-900">Retour d’équipe</h3><div className="grid gap-3 sm:grid-cols-2"><select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="">Choisir une équipe</option>{teams.map((row) => <option key={text(row, "id")} value={text(row, "id")}>#{text(row, "team_number")} · {text(row, "public_name")}</option>)}</select><CmmButton tone="primary" disabled={!divisionId || !teamId || busy} onClick={() => { void mutate({ action: "return", divisionId, teamId, actualReturnAt: new Date().toISOString(), reason: "Retour constaté à l’accueil", note: null }); }}>Constater le retour maintenant</CmmButton></div></CmmCard> : null}

    {canMeasure ? <CmmCard tone="slate" variant="glass" className="space-y-3 p-5"><h3 className="font-black text-slate-900">Saisie d’une mesure</h3><div className="grid gap-3 sm:grid-cols-2"><select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="">Choisir une équipe</option>{teams.map((row) => <option key={text(row, "id")} value={text(row, "id")}>#{text(row, "team_number")} · {text(row, "public_name")}</option>)}</select><select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" value={categoryRuleId} onChange={(event) => setCategoryRuleId(event.target.value)}><option value="">Choisir une catégorie</option>{categories.map((row) => <option key={text(row, "id")} value={text(row, "id")}>{text(row, "label")} · {text(row, "unit")}</option>)}</select><input className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" inputMode="decimal" placeholder="Valeur canonique" value={measurementValue} onChange={(event) => setMeasurementValue(event.target.value)} /><CmmButton tone="primary" disabled={!teamId || !categoryRuleId || !measurementValue || busy} onClick={() => { const kind = text(selectedCategory ?? {}, "measurement_kind"); const value = Number(measurementValue); void mutate({ action: "measurement", divisionId, teamId, categoryRuleId, measurementKind: kind, unit: text(selectedCategory ?? {}, "unit"), quantity: kind === "volume" ? value : null, massGrams: kind === "mass" ? value : null, objectCount: kind === "count" ? value : null, measurementMethod: "saisie terrain", provenance: "constat opérateur habilité", sourceKind: "field_entry", sourceReference: null, reason: "Mesure saisie depuis le cockpit terrain" }); }}>Enregistrer la mesure</CmmButton></div><p className="text-xs text-slate-600">La masse reste une masse et le comptage reste un comptage : aucune conversion implicite n’est effectuée.</p></CmmCard> : null}

    {canArbitrate ? <CmmCard tone="slate" variant="glass" className="space-y-3 p-5"><h3 className="font-black text-slate-900">Journal d’incident</h3><div className="grid gap-3 sm:grid-cols-2"><select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="">Incident général</option>{teams.map((row) => <option key={text(row, "id")} value={text(row, "id")}>#{text(row, "team_number")} · {text(row, "public_name")}</option>)}</select><select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" value={incidentCategory} onChange={(event) => setIncidentCategory(event.target.value)}><option value="safety">Sécurité</option><option value="delay">Retard</option><option value="boundary_violation">Zone</option><option value="sorting">Tri</option><option value="contest">Contest</option></select><textarea className="min-h-24 rounded-xl border border-slate-300 bg-white px-3 py-2 sm:col-span-2" placeholder="Observation brute, sans décision implicite" value={incidentText} onChange={(event) => setIncidentText(event.target.value)} /><CmmButton tone="important" disabled={!divisionId || !incidentText.trim() || busy} onClick={() => { void mutate({ action: "incident", divisionId, teamId: teamId || null, category: incidentCategory, observedAt: new Date().toISOString(), location: null, rawObservation: incidentText, reason: "Observation terrain enregistrée" }); }}>Enregistrer l’observation</CmmButton></div><p className="text-xs text-slate-600">Une observation n’applique aucune pénalité et ne prononce aucune disqualification automatiquement.</p></CmmCard> : null}

    {dashboard.incidents.length || dashboard.measurements.length ? <CmmCard tone="slate" variant="glass" className="space-y-3 p-5"><h3 className="font-black text-slate-900">Historique récent et décisions</h3>{canArbitrate && dashboard.incidents.some((row) => text(row, "decision_status") === "open") ? <div className="grid gap-3 sm:grid-cols-2"><input className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" placeholder="Référence du règlement" value={decisionRule} onChange={(event) => setDecisionRule(event.target.value)} /><input className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" placeholder="Justification de la décision" value={decisionJustification} onChange={(event) => setDecisionJustification(event.target.value)} /></div> : null}<ul className="space-y-2 text-sm text-slate-800">{dashboard.incidents.slice(0, 5).map((row) => <li key={text(row, "id")} className="rounded-xl border border-slate-200 p-3"><div><strong>{text(row, "category")}</strong> · {dateLabel(row.observed_at)} · {text(row, "decision_status")}</div>{canArbitrate && text(row, "decision_status") === "open" ? <div className="mt-2 flex flex-wrap gap-2"><CmmButton size="sm" tone="important" disabled={!decisionRule.trim() || !decisionJustification.trim() || busy} onClick={() => { void mutate({ action: "incident_decision", divisionId: text(row, "division_id"), incidentId: text(row, "id"), decisionKind: "warning", decisionPoints: null, ruleReference: decisionRule, justification: decisionJustification, scoreEffect: {} }); }}>Décider un avertissement</CmmButton><CmmButton size="sm" tone="critical" disabled={!decisionRule.trim() || !decisionJustification.trim() || busy} onClick={() => { void mutate({ action: "incident_decision", divisionId: text(row, "division_id"), incidentId: text(row, "id"), decisionKind: "disqualification", decisionPoints: null, ruleReference: decisionRule, justification: decisionJustification, scoreEffect: {} }); }}>Prononcer une disqualification</CmmButton></div> : null}</li>)}{dashboard.measurements.slice(0, 5).map((row) => <li key={text(row, "id")} className="rounded-xl border border-slate-200 p-3"><div><strong>{text(row, "measurement_kind")}</strong> · {text(row, "status")} · révision {text(row, "revision")} · {dateLabel(row.updated_at)}</div>{capabilitySet.has("certification") && text(row, "status") !== "certified" ? <div className="mt-2 flex flex-wrap gap-2"><CmmButton size="sm" tone="primary" disabled={busy} onClick={() => { void mutate({ action: "measurement_decision", divisionId: text(row, "division_id"), measurementId: text(row, "id"), decision: "certified", rejectionReason: null }); }}>Certifier la mesure</CmmButton><CmmButton size="sm" tone="secondary" disabled={busy} onClick={() => { void mutate({ action: "measurement_decision", divisionId: text(row, "division_id"), measurementId: text(row, "id"), decision: "rejected", rejectionReason: "Mesure à reprendre après contrôle" }); }}>Rejeter pour reprise</CmmButton></div> : null}</li>)}</ul></CmmCard> : null}
    {message ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-900">{message}</p> : null}
  </div>;
}

"use client";

import { useMemo, useState } from"react";
import useSWR from"swr";
import { ActionsMapFeed } from"@/components/actions/actions-map-feed";
import { mapItemType } from"@/lib/actions/data-contract";
import { fetchMapActions } from"@/lib/actions/http";
import { createSpot } from"@/lib/spots/http";
import { swrRecentViewOptions } from"@/lib/swr-config";
import { useSitePreferences } from"@/components/ui/site-preferences-provider";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";


export function TrashSpotterSection() {
 const { locale } = useSitePreferences();
 const fr = locale ==="fr";
 const [spotType, setSpotType] = useState<"clean_place" |"spot">("spot");
 const [spotLabel, setSpotLabel] = useState<string>("");
 const [spotLatitude, setSpotLatitude] = useState<string>("");
 const [spotLongitude, setSpotLongitude] = useState<string>("");
 const [spotNotes, setSpotNotes] = useState<string>("");
 const [spotState, setSpotState] = useState<
"idle" |"pending" |"success" |"error"
 >("idle");
 const [spotMessage, setSpotMessage] = useState<string | null>(null);

 const { data, isLoading, error, mutate } = useSWR(
 ["section-trash-spotter"],
 () =>
 fetchMapActions({
 status:"all",
 days: 180,
 limit: 250,
 types: ["clean_place","spot"],
 }),
 swrRecentViewOptions,
 );

 function toOptionalNumber(value: string): number | undefined {
 const trimmed = value.trim();
 if (!trimmed) {
 return undefined;
 }
 const parsed = Number(trimmed);
 return Number.isFinite(parsed) ? parsed : undefined;
 }

 async function onCreateSpot(): Promise<void> {
 if (spotState ==="pending") {
 return;
 }
 setSpotMessage(null);
 const label = spotLabel.trim();
 if (label.length < 2) {
 setSpotState("error");
 setSpotMessage(
 fr
 ?"Renseigne un libellé de spot (minimum 2 caractères)."
 :"Enter a spot label (minimum 2 characters).",
 );
 return;
 }
 const latitudeRaw = spotLatitude.trim();
 const longitudeRaw = spotLongitude.trim();
 const latitude = toOptionalNumber(spotLatitude);
 const longitude = toOptionalNumber(spotLongitude);
 const latitudeDefined = latitude !== undefined;
 const longitudeDefined = longitude !== undefined;

 if ((latitudeRaw && !latitudeDefined) || (longitudeRaw && !longitudeDefined)) {
 setSpotState("error");
 setSpotMessage(
 fr
 ?"Latitude/longitude invalides. Utilise des nombres décimaux."
 :"Invalid latitude/longitude. Use decimal numbers.",
 );
 return;
 }
 if (latitudeDefined !== longitudeDefined) {
 setSpotState("error");
 setSpotMessage(fr ?"Renseigne latitude et longitude ensemble." :"Provide latitude and longitude together.");
 return;
 }
 if (latitudeDefined && (latitude < -90 || latitude > 90)) {
 setSpotState("error");
 setSpotMessage(fr ?"Latitude hors plage (-90 à 90)." :"Latitude out of range (-90 to 90).");
 return;
 }
 if (longitudeDefined && (longitude < -180 || longitude > 180)) {
 setSpotState("error");
 setSpotMessage(fr ?"Longitude hors plage (-180 à 180)." :"Longitude out of range (-180 to 180).");
 return;
 }

  setSpotState("pending");

  // Optimistic UI update
  await mutate(
    async (currentData) => {
      if (!currentData) return currentData;
      return {
        ...currentData,
        items: [
          {
            id: `temp-${Date.now()}`,
            status: "pending",
            action_date: new Date().toISOString(),
            location_label: label,
            latitude: latitude ?? null,
            longitude: longitude ?? null,
            waste_kg: null,
            cigarette_butts: null,
            created_by_clerk_id: null,
            contract: {
              id: `temp-contract-${Date.now()}`,
              type: spotType,
              status: "pending",
              source: "optimistic",
              location: { label, latitude: latitude ?? null, longitude: longitude ?? null },
              geometry: { kind: "point", coordinates: [], geojson: null, confidence: null, geometrySource: "manual", origin: "manual" },
              dates: { observedAt: new Date().toISOString(), createdAt: new Date().toISOString(), importedAt: null, validatedAt: null },
              metadata: { actorName: null, notes: spotNotes.trim() || null, notesPlain: spotNotes.trim() || null, wasteKg: null, cigaretteButts: null, volunteersCount: 1, durationMinutes: 0, manualDrawing: null }
            }
          },
          ...currentData.items
        ]
      };
    },
    { revalidate: false }
  );

  try {
    const result = await createSpot({
      type: spotType,
      label,
      latitude,
      longitude,
      notes: spotNotes.trim() || undefined,
    });
    setSpotState("success");
    setSpotMessage(
      fr
        ? `Spot créé (${result.id}). En attente de modération admin.`
        : `Spot created (${result.id}). Awaiting admin moderation.`,
    );
    setSpotLabel("");
    setSpotLatitude("");
    setSpotLongitude("");
    setSpotNotes("");
    await mutate(); // Refetch actual data
  } catch (spotError) {
    setSpotState("error");
    setSpotMessage(
      spotError instanceof Error
        ? spotError.message
        : fr
        ? "Création du spot impossible."
        : "Unable to create the spot.",
    );
    await mutate(); // Rollback on error
  }
  }

 const quality = useMemo(() => {
 const items = (data?.items ?? []).filter((item) => {
 const type = mapItemType(item);
 return type ==="clean_place" || type ==="spot";
 });
 const pending = items.filter((item) => item.status ==="pending").length;
 const approved = items.filter((item) => item.status ==="approved").length;
 const withCoords = items.filter(
 (item) => item.latitude !== null && item.longitude !== null,
 ).length;
 const recent = [...items]
 .sort((a, b) => b.action_date.localeCompare(a.action_date))
 .slice(0, 6);
 return { pending, approved, withCoords, total: items.length, recent };
 }, [data?.items]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-900/30 bg-amber-950/20 p-4 cmm-text-small text-amber-400 backdrop-blur-sm">
        <span className="font-bold">Trash Spotter :</span> {fr
        ? "Signalement rapide et cartographie en temps réel des zones identifiées."
        : "Quick reporting and real-time mapping of identified areas."}
      </div>

      {/* KPI RAPIDES */}
      {!isLoading && !error ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <CmmCard tone="slate" size="sm" className="bg-slate-900/40 border-slate-800/40 backdrop-blur-md">
            <p className="cmm-text-caption font-bold uppercase tracking-widest cmm-text-muted">
              {fr ? "Signalements" : "Reports"}
            </p>
            <p className="mt-1 text-2xl font-black cmm-text-primary tracking-tight">{quality.total}</p>
          </CmmCard>
          <CmmCard tone="amber" size="sm" className="bg-amber-950/20 border-amber-900/40 backdrop-blur-md">
            <p className="cmm-text-caption font-bold uppercase tracking-widest text-amber-500/80">
              {fr ? "En attente" : "Pending"}
            </p>
            <p className="mt-1 text-2xl font-black text-amber-400 tracking-tight">{quality.pending}</p>
          </CmmCard>
          <CmmCard tone="emerald" size="sm" className="bg-emerald-950/20 border-emerald-900/40 backdrop-blur-md">
            <p className="cmm-text-caption font-bold uppercase tracking-widest text-emerald-500/80">
              {fr ? "Validés" : "Approved"}
            </p>
            <p className="mt-1 text-2xl font-black text-emerald-400 tracking-tight">{quality.approved}</p>
          </CmmCard>
          <CmmCard tone="slate" size="sm" className="bg-slate-900/40 border-slate-800/40 backdrop-blur-md">
            <p className="cmm-text-caption font-bold uppercase tracking-widest cmm-text-muted">
              {fr ? "Géo-couverture" : "Geo coverage"}
            </p>
            <p className="mt-1 text-2xl font-black cmm-text-primary tracking-tight">
              {quality.total > 0 ? `${Math.round((quality.withCoords / quality.total) * 100)}%` : "n/a"}
            </p>
          </CmmCard>
        </div>
      ) : null}

      {/* SPLIT: Formulaire (gauche) + Carte + Récents (droite) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_2fr] gap-8 items-start">

        {/* GAUCHE : Formulaire de signalement */}
        <div className="rounded-2xl border border-slate-800/40 bg-slate-900/40 backdrop-blur-md p-6 shadow-2xl space-y-6">
          <div>
            <h2 className="text-lg font-bold cmm-text-primary tracking-tight">
              {fr ? "Nouveau signalement" : "New report"}
            </h2>
            <p className="mt-1 cmm-text-caption cmm-text-secondary font-medium">
              {fr
                ? "Type clean_place ou spot. Statut initial : modération admin."
                : "Type clean_place or spot. Initial status: admin moderation."}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="flex flex-col gap-2 cmm-text-caption font-bold uppercase tracking-widest cmm-text-secondary">
              {fr ? "Type" : "Type"}
              <select
                value={spotType}
                onChange={(event) =>
                  setSpotType(event.target.value as "clean_place" | "spot")
                }
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 cmm-text-small font-medium cmm-text-primary outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
              >
                <option value="spot">Spot</option>
                <option value="clean_place">{fr ? "Lieu propre" : "Clean place"}</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 cmm-text-caption font-bold uppercase tracking-widest cmm-text-secondary">
              {fr ? "Libellé" : "Label"}
              <input
                value={spotLabel}
                onChange={(event) => setSpotLabel(event.target.value)}
                placeholder={fr ? "Ex: Angle rue de Rivoli" : "Ex: Rivoli corner"}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 cmm-text-small font-medium cmm-text-primary outline-none transition focus:border-emerald-500/50 placeholder:text-slate-700"
              />
            </label>
            <label className="flex flex-col gap-2 cmm-text-caption font-bold uppercase tracking-widest cmm-text-secondary">
              Latitude
              <input
                value={spotLatitude}
                onChange={(event) => setSpotLatitude(event.target.value)}
                placeholder="48.8566"
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 cmm-text-small font-medium cmm-text-primary outline-none transition focus:border-emerald-500/50 placeholder:text-slate-700"
              />
            </label>
            <label className="flex flex-col gap-2 cmm-text-caption font-bold uppercase tracking-widest cmm-text-secondary">
              Longitude
              <input
                value={spotLongitude}
                onChange={(event) => setSpotLongitude(event.target.value)}
                placeholder="2.3522"
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 cmm-text-small font-medium cmm-text-primary outline-none transition focus:border-emerald-500/50 placeholder:text-slate-700"
              />
            </label>
            <label className="flex flex-col gap-2 cmm-text-caption font-bold uppercase tracking-widest cmm-text-secondary md:col-span-2">
              {fr ? "Notes" : "Notes"}
              <textarea
                value={spotNotes}
                onChange={(event) => setSpotNotes(event.target.value)}
                rows={3}
                placeholder={fr ? "Contexte terrain, volume, urgence..." : "Field context, volume, urgency..."}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 cmm-text-small font-medium cmm-text-primary outline-none transition focus:border-emerald-500/50 placeholder:text-slate-700 resize-none"
              />
            </label>
          </div>
          <div className="pt-2">
            <button
              onClick={() => void onCreateSpot()}
              disabled={spotState === "pending"}
              className="w-full rounded-xl bg-amber-600 px-5 py-4 font-bold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20 active:scale-[0.98]"
            >
              {spotState === "pending"
                ? fr
                  ? "Création en cours..."
                  : "Creating..."
                : fr
                ? "Créer le signalement"
                : "Create report"}
            </button>
          </div>
          {spotMessage ? (
            <p
              className={`rounded-xl px-4 py-3 cmm-text-small font-medium transition-all ${
                spotState === "error"
                  ? "border border-rose-900/30 bg-rose-950/20 text-rose-400"
                  : "border border-emerald-900/30 bg-emerald-950/20 text-emerald-400"
              }`}
            >
              {spotMessage}
            </p>
          ) : null}
        </div>
        {/* DROITE : Carte + Détails */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <CmmSkeleton className="h-[250px] w-full rounded-2xl bg-slate-900/40" />
              <CmmSkeleton className="h-[400px] w-full rounded-2xl bg-slate-900/40" />
            </div>
          ) : null}
          {error ? (
            <p className="cmm-text-small text-rose-400 font-medium">
              {fr ? "Indicateurs Spotter indisponibles." : "Spotter metrics unavailable."}
            </p>
          ) : null}
          {!isLoading && !error ? (
            <div className="rounded-2xl border border-slate-800/40 bg-slate-900/40 backdrop-blur-md p-5 shadow-xl">
              <h3 className="cmm-text-small font-bold cmm-text-primary mb-4 uppercase tracking-widest">
                {fr ? "Derniers signalements" : "Latest reports"}
              </h3>
              <ul className="space-y-3">
                {quality.recent.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-800/60 bg-slate-950/40 px-4 py-3 transition-colors hover:bg-slate-900/60 group">
                    <div className="min-w-0">
                      <p className="font-bold cmm-text-primary truncate">{item.location_label}</p>
                      <p className="cmm-text-caption cmm-text-muted mt-0.5 font-medium">{item.action_date}</p>
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                      item.status === "approved" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" :
                      item.status === "pending" ? "bg-amber-500/20 text-amber-400 border border-amber-500/20" : "bg-rose-500/20 text-rose-400 border border-rose-500/20"
                    }`}>{item.status}</span>
                  </li>
                ))}
                {quality.recent.length === 0 ? (
                  <li className="cmm-text-muted italic py-4 text-center">
                    {fr ? "Aucun signalement récent." : "No recent reports."}
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
          <div className="rounded-2xl overflow-hidden border border-slate-800/40 shadow-2xl">
            <ActionsMapFeed
              types={["clean_place", "spot"]}
              days={180}
              statusFilter="all"
              impactFilter="all"
              qualityMin={0}
            />
          </div>
        </div>
      </div>
    </div>

 );
}

"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { ActionsMapFeed } from "@/components/actions/actions-map-feed";
import { mapItemType } from "@/lib/actions/data-contract";
import { fetchMapActions } from "@/lib/actions/http";
import { createSpot } from "@/lib/spots/http";
import { swrRecentViewOptions } from "@/lib/swr-config";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";


export function TrashSpotterSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const [spotType, setSpotType] = useState<"clean_place" | "spot">("spot");
  const [spotLabel, setSpotLabel] = useState<string>("");
  const [spotLatitude, setSpotLatitude] = useState<string>("");
  const [spotLongitude, setSpotLongitude] = useState<string>("");
  const [spotNotes, setSpotNotes] = useState<string>("");
  const [spotState, setSpotState] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [spotMessage, setSpotMessage] = useState<string | null>(null);

  const { data, isLoading, error, mutate } = useSWR(
    ["section-trash-spotter"],
    () =>
      fetchMapActions({
        status: "all",
        days: 180,
        limit: 250,
        types: ["clean_place", "spot"],
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
    if (spotState === "pending") {
      return;
    }
    setSpotMessage(null);
    const label = spotLabel.trim();
    if (label.length < 2) {
      setSpotState("error");
      setSpotMessage(
        fr
          ? "Renseigne un libellé de spot (minimum 2 caractères)."
          : "Enter a spot label (minimum 2 characters).",
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
          ? "Latitude/longitude invalides. Utilise des nombres décimaux."
          : "Invalid latitude/longitude. Use decimal numbers.",
      );
      return;
    }
    if (latitudeDefined !== longitudeDefined) {
      setSpotState("error");
      setSpotMessage(fr ? "Renseigne latitude et longitude ensemble." : "Provide latitude and longitude together.");
      return;
    }
    if (latitudeDefined && (latitude < -90 || latitude > 90)) {
      setSpotState("error");
      setSpotMessage(fr ? "Latitude hors plage (-90 à 90)." : "Latitude out of range (-90 to 90).");
      return;
    }
    if (longitudeDefined && (longitude < -180 || longitude > 180)) {
      setSpotState("error");
      setSpotMessage(fr ? "Longitude hors plage (-180 à 180)." : "Longitude out of range (-180 to 180).");
      return;
    }

    setSpotState("pending");
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
      await mutate();
    } catch (spotError) {
      setSpotState("error");
      setSpotMessage(
        spotError instanceof Error
          ? spotError.message
          : fr
            ? "Création du spot impossible."
            : "Unable to create the spot.",
      );
    }
  }

  const quality = useMemo(() => {
    const items = (data?.items ?? []).filter((item) => {
      const type = mapItemType(item);
      return type === "clean_place" || type === "spot";
    });
    const pending = items.filter((item) => item.status === "pending").length;
    const approved = items.filter((item) => item.status === "approved").length;
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
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        {fr
          ? "Flux Trash Spotter : signalement rapide et carte live des zones identifiées."
          : "Trash Spotter feed: quick reporting and live map of identified areas."}
      </div>

      {/* KPI RAPIDES */}
      {!isLoading && !error ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {fr ? "Signalements" : "Reports"}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{quality.total}</p>
          </article>
          <article className="rounded-xl border border-amber-100 bg-amber-50 p-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
              {fr ? "En attente" : "Pending"}
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{quality.pending}</p>
          </article>
          <article className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              {fr ? "Validés" : "Approved"}
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{quality.approved}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {fr ? "Géo-couverture" : "Geo coverage"}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {quality.total > 0 ? `${Math.round((quality.withCoords / quality.total) * 100)}%` : "n/a"}
            </p>
          </article>
        </div>
      ) : null}

      {/* SPLIT: Formulaire (gauche) + Carte + Récents (droite) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 items-start">

        {/* GAUCHE : Formulaire de signalement */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {fr ? "Nouveau signalement" : "New report"}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              {fr
                ? "Type <code>clean_place</code> ou <code>spot</code>. Statut initial : modération admin."
                : "Type <code>clean_place</code> or <code>spot</code>. Initial status: admin moderation."}
            </p>
          </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            {fr ? "Type" : "Type"}
            <select
              value={spotType}
              onChange={(event) =>
                setSpotType(event.target.value as "clean_place" | "spot")
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-emerald-500"
            >
              <option value="spot">Spot</option>
              <option value="clean_place">{fr ? "Lieu propre" : "Clean place"}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            {fr ? "Libellé" : "Label"}
            <input
              value={spotLabel}
              onChange={(event) => setSpotLabel(event.target.value)}
              placeholder={fr ? "Ex: Angle rue de Rivoli / Châtelet" : "Ex: Rivoli / Châtelet corner"}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-emerald-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Latitude
            <input
              value={spotLatitude}
              onChange={(event) => setSpotLatitude(event.target.value)}
              placeholder="48.8566"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-emerald-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Longitude
            <input
              value={spotLongitude}
              onChange={(event) => setSpotLongitude(event.target.value)}
              placeholder="2.3522"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-emerald-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 md:col-span-2">
            {fr ? "Notes" : "Notes"}
            <textarea
              value={spotNotes}
              onChange={(event) => setSpotNotes(event.target.value)}
              rows={3}
              placeholder={fr ? "Contexte terrain, volume estimé, urgence." : "Field context, estimated volume, urgency."}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-emerald-500"
            />
          </label>
        </div>
        <div className="mt-3">
          <button
            onClick={() => void onCreateSpot()}
            disabled={spotState === "pending"}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
            {spotState === "pending"
              ? fr
                ? "Création..."
                : "Creating..."
              : fr
                ? "Créer le signalement"
                : "Create report"}
          </button>
        </div>
        {spotMessage ? (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              spotState === "error"
                ? "border border-rose-200 bg-rose-50 text-rose-700"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {spotMessage}
          </p>
        ) : null}
      </div>
        {/* DROITE : Carte + Détails */}
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-slate-500">
              {fr ? "Chargement des indicateurs Spotter..." : "Loading Spotter metrics..."}
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-rose-700">
              {fr ? "Indicateurs Spotter indisponibles." : "Spotter metrics unavailable."}
            </p>
          ) : null}
          {!isLoading && !error ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                {fr ? "Derniers signalements" : "Latest reports"}
              </h3>
              <ul className="space-y-2 text-sm text-slate-700">
                {quality.recent.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <div>
                      <p className="font-medium">{item.location_label}</p>
                      <p className="text-xs text-slate-500">{item.action_date}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      item.status === "approved" ? "bg-emerald-50 text-emerald-700" :
                      item.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                    }`}>{item.status}</span>
                  </li>
                ))}
                {quality.recent.length === 0 ? (
                  <li className="text-slate-500 italic">
                    {fr ? "Aucun signalement récent." : "No recent reports."}
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
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
  );
}

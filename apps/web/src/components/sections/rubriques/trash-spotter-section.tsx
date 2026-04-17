"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { ActionsMapFeed } from "@/components/actions/actions-map-feed";
import { mapItemType } from "@/lib/actions/data-contract";
import { fetchMapActions } from "@/lib/actions/http";
import { createSpot } from "@/lib/spots/http";
import { swrRecentViewOptions } from "@/lib/swr-config";


export function TrashSpotterSection() {
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
      setSpotMessage("Renseigne un libelle de spot (minimum 2 caracteres).");
      return;
    }

    setSpotState("pending");
    try {
      const result = await createSpot({
        type: spotType,
        label,
        latitude: toOptionalNumber(spotLatitude),
        longitude: toOptionalNumber(spotLongitude),
        notes: spotNotes.trim() || undefined,
      });
      setSpotState("success");
      setSpotMessage(
        `Spot cree (${result.id}). En attente de moderation admin.`,
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
          : "Creation spot impossible.",
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
        Le flux Trash Spotter est migre dans Next.js: lecture carte, filtrage et
        declaration rapide depuis l&apos;interface web.
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Nouveau signalement clean_place / spot
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          Creation publique via <code>POST /api/spots</code>. Le statut initial
          est <span className="font-semibold">new</span>, puis moderation admin.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Type
            <select
              value={spotType}
              onChange={(event) =>
                setSpotType(event.target.value as "clean_place" | "spot")
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-emerald-500"
            >
              <option value="spot">Spot</option>
              <option value="clean_place">Lieu propre</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Libelle
            <input
              value={spotLabel}
              onChange={(event) => setSpotLabel(event.target.value)}
              placeholder="Ex: Angle rue de Rivoli / Chatelet"
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
            Notes
            <textarea
              value={spotNotes}
              onChange={(event) => setSpotNotes(event.target.value)}
              rows={3}
              placeholder="Contexte terrain, volume estime, urgence."
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
            {spotState === "pending" ? "Creation..." : "Creer le signalement"}
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

      <div className="grid gap-3 md:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Signalements
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {quality.total}
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            En attente
          </p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">
            {quality.pending}
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Valides
          </p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">
            {quality.approved}
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Geo-couverture
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {quality.total > 0
              ? `${Math.round((quality.withCoords / quality.total) * 100)}%`
              : "n/a"}
          </p>
        </article>
      </div>
      {isLoading ? (
        <p className="text-sm text-slate-500">
          Chargement des indicateurs Spotter...
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-rose-700">
          Indicateurs Spotter indisponibles.
        </p>
      ) : null}
      {!isLoading && !error ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Derniers signalements
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {quality.recent.map((item) => (
              <li key={item.id}>
                {item.action_date} - {item.location_label} (
                {mapItemType(item) === "clean_place" ? "lieu propre" : "spot"})
                - {item.status}
              </li>
            ))}
            {quality.recent.length === 0 ? (
              <li>Aucun signalement recent.</li>
            ) : null}
          </ul>
        </div>
      ) : null}
      <ActionsMapFeed types={["clean_place", "spot"]} />
    </div>
  );
}

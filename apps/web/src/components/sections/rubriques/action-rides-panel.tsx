"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CmmButton } from "@/components/ui/cmm-button";

type RideRequest = {
  id: string;
  seatsRequested: number;
  message: string | null;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  resolvedAt: string | null;
  passengerDisplayName?: string;
};

type Ride = {
  id: string;
  originZoneName: string;
  departureAt: string;
  seatsTotal: number;
  seatsAvailable: number;
  note: string | null;
  status: "open" | "closed" | "cancelled";
  driverDisplayName: string;
  isDriver: boolean;
  myRequests: RideRequest[];
  requests: RideRequest[];
};

type RideResponse = { rides: Ride[] };
type RideFormValues = { originZoneName: string; departureAt: string; seatsTotal: string; note: string };

const EMPTY_FORM: RideFormValues = { originZoneName: "", departureAt: "", seatsTotal: "1", note: "" };

function messageFromPayload(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string") {
    return (payload as { error: string }).error;
  }
  return fallback;
}

function dateLabel(value: string): string {
  return new Date(value).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function localDateTimeValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function requestJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(messageFromPayload(payload, "L’opération covoiturage a échoué."));
  return payload;
}

function RideForm({
  values,
  submitting,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  fr,
}: {
  values: RideFormValues;
  submitting: boolean;
  onChange: (patch: Partial<RideFormValues>) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel: string;
  fr: boolean;
}) {
  return <form className="mt-3 space-y-3 rounded-xl border border-emerald-100 bg-white p-3" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold text-slate-700">Zone approximative<input required value={values.originZoneName} onChange={(event) => onChange({ originZoneName: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" placeholder="Commune ou arrondissement reconnu" /></label>
      <label className="text-sm font-semibold text-slate-700">Départ<input required type="datetime-local" value={values.departureAt} onChange={(event) => onChange({ departureAt: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
    </div>
    <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_1fr]">
      <label className="text-sm font-semibold text-slate-700">Places<input required type="number" min={1} max={8} value={values.seatsTotal} onChange={(event) => onChange({ seatsTotal: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
      <label className="text-sm font-semibold text-slate-700">Note facultative<textarea maxLength={200} value={values.note} onChange={(event) => onChange({ note: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2" rows={2} /></label>
    </div>
    <p className="text-xs leading-relaxed text-slate-800">N&apos;indiquez pas votre adresse exacte ici. Les détails pratiques seront échangés en privé après acceptation.</p>
    <div className="flex flex-wrap gap-2"><CmmButton type="submit" tone="primary" variant="pill" size="sm" loading={submitting}>{submitLabel}</CmmButton>{onCancel ? <CmmButton type="button" tone="tertiary" variant="pill" size="sm" onClick={onCancel}>{fr ? "Annuler" : "Cancel"}</CmmButton> : null}</div>
  </form>;
}

function RideRequestForm({ onSubmit, submitting, fr }: { onSubmit: (seatsRequested: number, message: string) => void; submitting: boolean; fr: boolean }) {
  const [seats, setSeats] = useState("1");
  const [message, setMessage] = useState("");
  return <form className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3" onSubmit={(event) => { event.preventDefault(); onSubmit(Number(seats), message); }}>
    <div className="grid gap-2 sm:grid-cols-[minmax(0,7rem)_1fr]">
      <label className="text-xs font-bold text-slate-700">Places<input type="number" min={1} max={4} value={seats} onChange={(event) => setSeats(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2" /></label>
      <label className="text-xs font-bold text-slate-700">Message privé facultatif<textarea maxLength={200} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 py-1" rows={2} /></label>
    </div>
    <CmmButton type="submit" tone="primary" variant="pill" size="sm" loading={submitting}>{fr ? "Envoyer la demande" : "Send request"}</CmmButton>
  </form>;
}

function RideCard({ ride, fr, busy, onRequest, onDecision, onCancel, onContact, onEdit }: { ride: Ride; fr: boolean; busy: string | null; onRequest: (ride: Ride, seats: number, message: string) => void; onDecision: (ride: Ride, request: RideRequest, decision: "accept" | "decline" | "withdraw") => void; onCancel: (ride: Ride) => void; onContact: (ride: Ride, request?: RideRequest) => void; onEdit: (ride: Ride) => void }) {
  const pendingMine = ride.myRequests.find((request) => request.status === "pending");
  return <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold text-slate-950">{ride.originZoneName}</p><p className="text-sm text-slate-600">{dateLabel(ride.departureAt)} · {ride.seatsAvailable} / {ride.seatsTotal} place(s) restante(s)</p><p className="text-xs text-slate-500">Conducteur : {ride.driverDisplayName}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ride.status === "open" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{ride.status === "open" ? "Ouvert" : ride.status === "cancelled" ? "Annulé" : "Fermé"}</span></div>
    {ride.note ? <p className="mt-2 text-sm text-slate-700">{ride.note}</p> : null}
    {ride.isDriver ? <div className="mt-3 space-y-2 border-t border-slate-100 pt-3"><div className="flex flex-wrap gap-2"><CmmButton type="button" tone="tertiary" variant="pill" size="sm" onClick={() => onEdit(ride)}>{fr ? "Modifier" : "Edit"}</CmmButton>{ride.status === "open" ? <CmmButton type="button" tone="tertiary" variant="pill" size="sm" onClick={() => onCancel(ride)}>{fr ? "Annuler le trajet" : "Cancel ride"}</CmmButton> : null}</div>{ride.requests.map((request) => <div key={request.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm"><p className="font-semibold text-slate-800">{request.passengerDisplayName ?? "Membre"} · {request.seatsRequested} place(s) · {request.status}</p>{request.message ? <p className="mt-1 text-slate-600">{request.message}</p> : null}{request.status === "pending" ? <div className="mt-2 flex flex-wrap gap-2"><CmmButton type="button" tone="primary" variant="pill" size="sm" loading={busy === `accept:${request.id}`} onClick={() => onDecision(ride, request, "accept")}>Accepter</CmmButton><CmmButton type="button" tone="tertiary" variant="pill" size="sm" loading={busy === `decline:${request.id}`} onClick={() => onDecision(ride, request, "decline")}>Refuser</CmmButton></div> : null}{request.status === "accepted" ? <CmmButton type="button" tone="secondary" variant="pill" size="sm" className="mt-2" onClick={() => onContact(ride, request)}>Contacter en privé</CmmButton> : null}</div>)}</div> : <div className="mt-3 border-t border-slate-100 pt-3">{pendingMine ? <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold text-amber-800">Demande en attente</span><CmmButton type="button" tone="tertiary" variant="pill" size="sm" loading={busy === `withdraw:${pendingMine.id}`} onClick={() => onDecision(ride, pendingMine, "withdraw")}>Retirer</CmmButton></div> : ride.myRequests.map((request) => <div key={request.id} className="flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold text-slate-700">Demande {request.status}</span>{request.status === "accepted" ? <CmmButton type="button" tone="secondary" variant="pill" size="sm" onClick={() => onContact(ride, request)}>Contacter en privé</CmmButton> : null}</div>)}{ride.status === "open" && !pendingMine && ride.seatsAvailable > 0 ? <RideRequestForm fr={fr} submitting={busy === `request:${ride.id}`} onSubmit={(seats, message) => onRequest(ride, seats, message)} /> : null}</div>}
  </article>;
}

export function ActionRidesPanel({ actionId, fr }: { actionId: string; fr: boolean }) {
  const router = useRouter();
  const endpoint = `/api/actions/${encodeURIComponent(actionId)}/rides`;
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editRide, setEditRide] = useState<Ride | null>(null);
  const [form, setForm] = useState<RideFormValues>(EMPTY_FORM);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await requestJson(endpoint) as RideResponse;
      setRides(Array.isArray(payload.rides) ? payload.rides : []);
      setError(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Le covoiturage est temporairement indisponible.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) reload().catch(() => undefined);
    });
    return () => {
      active = false;
    };
  }, [reload]);

  const mutate = useCallback(async (key: string, url: string, init: RequestInit) => {
    setBusy(key);
    setError(null);
    try {
      await requestJson(url, init);
      await reload();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "L’opération covoiturage a échoué.");
    } finally {
      setBusy(null);
    }
  }, [reload]);

  function submitRide() {
    const payload = { originZoneName: form.originZoneName, departureAt: form.departureAt, seatsTotal: Number(form.seatsTotal), note: form.note };
    const url = editRide ? `${endpoint}/${encodeURIComponent(editRide.id)}` : endpoint;
    void mutate(editRide ? `edit:${editRide.id}` : "create", url, { method: editRide ? "PATCH" : "POST", body: JSON.stringify(payload) });
    setShowForm(false);
    setEditRide(null);
  }

  async function contact(ride: Ride, request?: RideRequest) {
    setBusy(`contact:${ride.id}`);
    setError(null);
    try {
      const query = request ? `?requestId=${encodeURIComponent(request.id)}` : "";
      const result = await requestJson(`${endpoint}/${encodeURIComponent(ride.id)}/contact${query}`) as { recipient: { id: string; displayName: string; handle: string | null } };
      const params = new URLSearchParams({ tab: "dm", channel: "dm", recipientId: result.recipient.id, recipientLabel: result.recipient.displayName });
      if (result.recipient.handle) params.set("recipientHandle", result.recipient.handle);
      router.push(`/sections/messagerie?${params.toString()}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Le contact privé est indisponible.");
    } finally {
      setBusy(null);
    }
  }

  return <section aria-labelledby={`action-rides-title-${actionId}`} className="mt-4 rounded-2xl border border-sky-200 bg-sky-50/60 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 id={`action-rides-title-${actionId}`} className="text-base font-black text-sky-950">Covoiturage</h4><p className="mt-1 text-sm text-slate-800">Trajets proposés entre personnes inscrites et confirmées.</p></div><CmmButton type="button" tone="secondary" variant="pill" size="sm" onClick={() => { setEditRide(null); setForm(EMPTY_FORM); setShowForm((value) => !value); }}>{showForm ? "Fermer" : "Proposer un trajet"}</CmmButton></div>{error ? <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">{error}</p> : null}{showForm ? <RideForm fr={fr} values={form} submitting={busy === "create" || Boolean(editRide && busy === `edit:${editRide.id}`)} onChange={(patch) => setForm((value) => ({ ...value, ...patch }))} onSubmit={submitRide} onCancel={() => { setShowForm(false); setEditRide(null); }} submitLabel={editRide ? "Enregistrer" : "Proposer"} /> : null}{loading ? <p role="status" className="mt-3 text-sm font-semibold text-sky-800">Chargement des trajets…</p> : null}{!loading && rides.length === 0 ? <p className="mt-3 rounded-lg border border-dashed border-sky-200 bg-white px-3 py-3 text-sm text-slate-800">Aucun trajet proposé pour le moment.</p> : null}<div className="mt-3 grid gap-3">{rides.map((ride) => <RideCard key={ride.id} ride={ride} fr={fr} busy={busy} onRequest={(current, seats, message) => void mutate(`request:${current.id}`, `${endpoint}/${encodeURIComponent(current.id)}/requests`, { method: "POST", body: JSON.stringify({ seatsRequested: seats, message }) })} onDecision={(current, request, decision) => void mutate(`${decision}:${request.id}`, `${endpoint}/${encodeURIComponent(current.id)}/requests/${encodeURIComponent(request.id)}`, { method: "PATCH", body: JSON.stringify({ decision }) })} onCancel={(current) => void mutate(`cancel:${current.id}`, `${endpoint}/${encodeURIComponent(current.id)}`, { method: "DELETE" })} onContact={(current, request) => { void contact(current, request); }} onEdit={(current) => { setEditRide(current); setForm({ originZoneName: current.originZoneName, departureAt: localDateTimeValue(current.departureAt), seatsTotal: String(current.seatsTotal), note: current.note ?? "" }); setShowForm(true); }} />)}</div></section>;
}

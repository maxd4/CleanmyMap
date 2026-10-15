"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, CalendarDays, MapPin, Plus, ShieldCheck } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import type { EventRow } from "@/lib/spogomi/preparation-service";
import {
  reuseOrCreateSpogomiCreationAttempt,
  type SpogomiCreationAttempt,
  type SpogomiCreationPayload,
} from "./spogomi-organizer-dashboard.creation";

function formatDate(value: string | null) {
  if (!value) return "Date à préciser";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date indisponible" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(date);
}

function inputClassName() {
  return "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200";
}

export type SpogomiOrganizerDashboardView = "all" | "events" | "create";

export function SpogomiOrganizerDashboard({
  initialEvents,
  view = "all",
}: {
  initialEvents: EventRow[];
  view?: SpogomiOrganizerDashboardView;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const creationAttemptRef = useRef<SpogomiCreationAttempt | null>(null);
  const submissionInFlightRef = useRef(false);

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (submissionInFlightRef.current) return;

    submissionInFlightRef.current = true;
    setPending(true);
    setMessage(null);
    setError(null);
    const form = new FormData(formElement);
    const startsAt = String(form.get("startsAt") ?? "");
    const endsAt = String(form.get("endsAt") ?? "");
    const startsAtDate = new Date(startsAt);
    const endsAtDate = endsAt ? new Date(endsAt) : null;
    if (!startsAt || Number.isNaN(startsAtDate.getTime()) || (endsAt && Number.isNaN(endsAtDate?.getTime()))) {
      setError("Saisissez une date de début valide et, si nécessaire, une date de fin valide.");
      submissionInFlightRef.current = false;
      setPending(false);
      return;
    }
    if (endsAtDate && endsAtDate < startsAtDate) {
      setError("La date de fin doit être postérieure ou égale au début.");
      submissionInFlightRef.current = false;
      setPending(false);
      return;
    }

    const payload: SpogomiCreationPayload = {
      name: String(form.get("name") ?? ""),
      locationLabel: String(form.get("locationLabel") ?? ""),
      mode: String(form.get("mode") ?? "casual") as SpogomiCreationPayload["mode"],
      startsAt: startsAtDate.toISOString(),
      endsAt: endsAtDate ? endsAtDate.toISOString() : null,
    };
    const attempt = reuseOrCreateSpogomiCreationAttempt(
      creationAttemptRef.current,
      payload,
      () => crypto.randomUUID(),
    );
    creationAttemptRef.current = attempt;

    try {
      const response = await fetch("/api/spogomi/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: attempt.idempotencyKey,
          ...attempt.payload,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "La compétition n’a pas pu être créée.");
      creationAttemptRef.current = null;
      formElement.reset();
      setMessage("Compétition créée en privé. Vous pouvez maintenant ouvrir son espace de préparation.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La compétition n’a pas pu être créée.");
    } finally {
      submissionInFlightRef.current = false;
      setPending(false);
    }
  }

  const showCreation = view !== "events";
  const showEvents = view !== "create";

  return (
    <div className="space-y-8">
      {showCreation ? <CmmCard tone="emerald" variant="glass" className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 text-emerald-700" size={22} aria-hidden="true" />
          <div>
            <h2 className="text-xl font-black text-emerald-950">Créer une compétition</h2>
            <p className="cmm-text-body mt-1 text-slate-900">La date vient de votre saisie. Toute nouvelle compétition reste privée jusqu’à sa publication explicite.</p>
          </div>
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void createEvent(event)}>
          <label className="space-y-1 text-sm font-bold text-slate-800">Nom<input className={inputClassName()} name="name" required maxLength={160} /></label>
          <label className="space-y-1 text-sm font-bold text-slate-800">Lieu<input className={inputClassName()} name="locationLabel" required maxLength={200} /></label>
          <label className="space-y-1 text-sm font-bold text-slate-800">Mode<select className={inputClassName()} name="mode" defaultValue="casual"><option value="casual">Casual</option><option value="world_cup">World Cup</option><option value="mixed">Casual &amp; World Cup</option></select></label>
          <label className="space-y-1 text-sm font-bold text-slate-800">Début<input className={inputClassName()} name="startsAt" type="datetime-local" required /></label>
          <label className="space-y-1 text-sm font-bold text-slate-800">Fin (facultative)<input className={inputClassName()} name="endsAt" type="datetime-local" /></label>
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <CmmButton type="submit" tone="primary" loading={pending}><Plus size={16} />Créer en privé</CmmButton>
            {message ? <p role="status" className="text-sm font-semibold text-emerald-800">{message}</p> : null}
            {error ? <p role="alert" className="text-sm font-semibold text-red-700">{error}</p> : null}
          </div>
        </form>
      </CmmCard> : null}

      {showEvents ? <section className="space-y-4" aria-labelledby="spogomi-organizer-events-title">
        <div>
          <h2 id="spogomi-organizer-events-title" className="text-2xl font-black text-slate-950">Mes événements SPOGOMI</h2>
          <p className="cmm-text-body mt-1 text-slate-900">Seuls les événements autorisés pour votre identité sont listés ici.</p>
        </div>
        {initialEvents.length === 0 ? (
          <CmmCard tone="slate" variant="glass" className="border-dashed p-6">
            <p className="font-bold text-slate-900">Aucun événement gérable pour le moment.</p>
            <p className="mt-2 text-sm text-slate-600">Créez une compétition privée ou demandez à être ajouté comme organisateur.</p>
            <CmmButton href="/spogomi/nouveau" tone="primary" size="sm" className="mt-4">Créer une compétition <Plus size={15} /></CmmButton>
          </CmmCard>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {initialEvents.map((event) => (
              <CmmCard key={event.id} tone="emerald" variant="glass" className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black text-emerald-950">{event.name}</h3>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.15em] text-slate-600">{event.public_visibility === "published" ? "Publié" : "Privé"} · {event.state}</p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-bold text-slate-700">{event.mode === "mixed" ? "Casual & World Cup" : event.mode === "world_cup" ? "World Cup" : "Casual"}</span>
                </div>
                <div className="space-y-2 text-sm text-slate-700">
                  <p className="flex items-center gap-2"><CalendarDays size={15} className="text-emerald-700" />{formatDate(event.starts_at)}</p>
                  <p className="flex items-center gap-2"><MapPin size={15} className="text-emerald-700" />{event.location_label}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {event.event_slug ? <CmmButton href={`/spogomi/${encodeURIComponent(event.event_slug)}/espace`} tone="primary" size="sm">Gérer cette compétition <ArrowRight size={15} /></CmmButton> : null}
                  {event.public_visibility === "published" && event.event_slug ? <CmmButton href={`/spogomi/${encodeURIComponent(event.event_slug)}`} tone="secondary" size="sm">Voir la page publique</CmmButton> : null}
                </div>
              </CmmCard>
            ))}
          </div>
        )}
      </section> : null}
      <div className="flex flex-wrap gap-4">
        {view === "events" ? <Link href="/spogomi/nouveau" className="inline-flex min-h-11 items-center gap-2 font-bold text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Créer une compétition <Plus size={16} /></Link> : null}
        {view === "create" ? <Link href="/spogomi/mes-evenements" className="inline-flex min-h-11 items-center gap-2 font-bold text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Voir mes événements <ArrowRight size={16} /></Link> : null}
        <Link href="/spogomi" className="inline-flex min-h-11 items-center gap-2 font-bold text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Retour à SPOGOMI <ArrowRight size={16} /></Link>
      </div>
    </div>
  );
}

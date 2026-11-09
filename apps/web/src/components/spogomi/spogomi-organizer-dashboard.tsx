"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, CalendarDays, MapPin, Plus, ShieldCheck } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import type { EventRow } from "@/lib/spogomi/preparation-service";
import { formatDateTimeInTimeZone } from "@/lib/time/civil-date";
import {
  reuseOrCreateSpogomiCreationAttempt,
  type SpogomiCreationAttempt,
  type SpogomiCreationPayload,
} from "./spogomi-organizer-dashboard.creation";

function formatDate(value: string | null, timeZone: string | null | undefined) {
  if (!value) return "Date à préciser";
  try {
    return formatDateTimeInTimeZone(value, timeZone || "Europe/Paris", { dateStyle: "long", timeStyle: "short" });
  } catch {
    return "Date indisponible";
  }
}

function inputClassName() {
  return "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200";
}

type CreationField = "name" | "locationLabel" | "mode" | "startsAt" | "endsAt";
type FieldErrors = Partial<Record<CreationField, string[]>>;
type ParsedCreationError = { message: string; fieldErrors: FieldErrors; referenceCode: string | null };

const FIELD_LABELS: Record<CreationField, string> = {
  name: "Nom",
  locationLabel: "Lieu",
  mode: "Mode",
  startsAt: "Début",
  endsAt: "Fin",
};

function parseCreationError(value: unknown, fallback: string): ParsedCreationError {
  const result: ParsedCreationError = { message: fallback, fieldErrors: {}, referenceCode: null };
  if (typeof value !== "object" || value === null) return result;
  const record = value as Record<string, unknown>;
  if (typeof record.error === "string") result.message = record.error;
  if (typeof record.referenceCode === "string") result.referenceCode = record.referenceCode;
  if (typeof record.details === "object" && record.details !== null) {
    for (const [field, messages] of Object.entries(record.details as Record<string, unknown>)) {
      if (!Object.hasOwn(FIELD_LABELS, field) || !Array.isArray(messages)) continue;
      const safeMessages = messages.filter((message): message is string => typeof message === "string");
      if (safeMessages.length) result.fieldErrors[field as CreationField] = safeMessages;
    }
  }
  return result;
}

function FieldError({ field, messages }: { field: CreationField; messages?: readonly string[] }) {
  if (!messages?.length) return null;
  return <div id={`spogomi-create-${field}-error`} className="text-sm font-semibold text-red-700"><ul className="list-disc pl-5">{messages.map((message) => <li key={message}>{message}</li>)}</ul></div>;
}

export type SpogomiOrganizerDashboardView = "all" | "events" | "create";

export function SpogomiOrganizerDashboard({
  initialEvents,
  view = "all",
  canCreate = false,
}: {
  initialEvents: EventRow[];
  view?: SpogomiOrganizerDashboardView;
  canCreate?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [referenceCode, setReferenceCode] = useState<string | null>(null);
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
    setFieldErrors({});
    setReferenceCode(null);
    const form = new FormData(formElement);
    const startsAt = String(form.get("startsAt") ?? "");
    const endsAt = String(form.get("endsAt") ?? "");
    if (!startsAt) {
      setError("Saisissez une date de début valide et, si nécessaire, une date de fin valide.");
      setFieldErrors({ startsAt: ["Saisissez une date de début valide."] });
      submissionInFlightRef.current = false;
      setPending(false);
      return;
    }
    if (endsAt && endsAt < startsAt) {
      setError("La date de fin doit être postérieure ou égale au début.");
      setFieldErrors({ endsAt: ["La date de fin doit être postérieure ou égale au début."] });
      submissionInFlightRef.current = false;
      setPending(false);
      return;
    }

    const payload: SpogomiCreationPayload = {
      name: String(form.get("name") ?? ""),
      locationLabel: String(form.get("locationLabel") ?? ""),
      mode: String(form.get("mode") ?? "casual") as SpogomiCreationPayload["mode"],
      startsAt,
      endsAt: endsAt || null,
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
      const body: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        const parsedError = parseCreationError(body, "La compétition n’a pas pu être créée.");
        setError(parsedError.message);
        setFieldErrors(parsedError.fieldErrors);
        setReferenceCode(parsedError.referenceCode);
        return;
      }
      const eventSlug = typeof body === "object" && body !== null && "eventSlug" in body && typeof body.eventSlug === "string" ? body.eventSlug : null;
      creationAttemptRef.current = null;
      formElement.reset();
      setMessage("Compétition créée en privé. Vous pouvez maintenant ouvrir son espace de préparation.");
      if (eventSlug) router.push(`/spogomi/${encodeURIComponent(eventSlug)}/espace`);
      else router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La compétition n’a pas pu être créée.");
      setFieldErrors({});
      setReferenceCode(null);
    } finally {
      submissionInFlightRef.current = false;
      setPending(false);
    }
  }

  const showCreation = view !== "events" && canCreate;
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
        <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ createEvent(event); }}>
          {error ? <div id="spogomi-create-error-summary" role="alert" aria-live="assertive" tabIndex={-1} className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 md:col-span-2">
            <p className="font-black">{error}</p>
            {Object.entries(fieldErrors).length ? <ul className="list-disc space-y-1 pl-5">{Object.entries(fieldErrors).map(([field, messages]) => <li key={field}><a className="font-bold underline" href={`#spogomi-create-${field}`}>{FIELD_LABELS[field as CreationField] ?? field} : {messages?.join(" ")}</a></li>)}</ul> : null}
            {referenceCode ? <p>Référence de suivi : <code className="font-bold">{referenceCode}</code></p> : null}
          </div> : null}
          <label htmlFor="spogomi-create-name" className="space-y-1 text-sm font-bold text-slate-800">Nom<input id="spogomi-create-name" className={inputClassName()} name="name" required maxLength={160} aria-invalid={Boolean(fieldErrors.name?.length)} aria-describedby={fieldErrors.name?.length ? "spogomi-create-name-error" : undefined} /><FieldError field="name" messages={fieldErrors.name} /></label>
          <label htmlFor="spogomi-create-locationLabel" className="space-y-1 text-sm font-bold text-slate-800">Lieu<input id="spogomi-create-locationLabel" className={inputClassName()} name="locationLabel" required maxLength={200} aria-invalid={Boolean(fieldErrors.locationLabel?.length)} aria-describedby={fieldErrors.locationLabel?.length ? "spogomi-create-locationLabel-error" : undefined} /><FieldError field="locationLabel" messages={fieldErrors.locationLabel} /></label>
          <label htmlFor="spogomi-create-mode" className="space-y-1 text-sm font-bold text-slate-800">Mode<select id="spogomi-create-mode" className={inputClassName()} name="mode" defaultValue="casual" aria-invalid={Boolean(fieldErrors.mode?.length)} aria-describedby={fieldErrors.mode?.length ? "spogomi-create-mode-error" : undefined}><option value="casual">Casual</option><option value="world_cup">World Cup</option><option value="mixed">Casual &amp; World Cup</option></select><FieldError field="mode" messages={fieldErrors.mode} /></label>
          <label htmlFor="spogomi-create-startsAt" className="space-y-1 text-sm font-bold text-slate-800">Début<input id="spogomi-create-startsAt" className={inputClassName()} name="startsAt" type="datetime-local" required aria-invalid={Boolean(fieldErrors.startsAt?.length)} aria-describedby={fieldErrors.startsAt?.length ? "spogomi-create-startsAt-error" : undefined} /><FieldError field="startsAt" messages={fieldErrors.startsAt} /></label>
          <label htmlFor="spogomi-create-endsAt" className="space-y-1 text-sm font-bold text-slate-800">Fin (facultative)<input id="spogomi-create-endsAt" className={inputClassName()} name="endsAt" type="datetime-local" aria-invalid={Boolean(fieldErrors.endsAt?.length)} aria-describedby={fieldErrors.endsAt?.length ? "spogomi-create-endsAt-error" : undefined} /><FieldError field="endsAt" messages={fieldErrors.endsAt} /></label>
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
            {canCreate ? <CmmButton href="/spogomi/nouveau" tone="primary" size="sm" className="mt-4">Créer une compétition <Plus size={15} /></CmmButton> : null}
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
                  <p className="flex items-center gap-2"><CalendarDays size={15} className="text-emerald-700" />{formatDate(event.starts_at, event.official_timezone)}</p>
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
        {view === "events" && canCreate ? <Link href="/spogomi/nouveau" className="inline-flex min-h-11 items-center gap-2 font-bold text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Créer une compétition <Plus size={16} /></Link> : null}
        {view === "create" ? <Link href="/spogomi/mes-evenements" className="inline-flex min-h-11 items-center gap-2 font-bold text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Voir mes événements <ArrowRight size={16} /></Link> : null}
        <Link href="/spogomi" className="inline-flex min-h-11 items-center gap-2 font-bold text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Retour à SPOGOMI <ArrowRight size={16} /></Link>
      </div>
    </div>
  );
}

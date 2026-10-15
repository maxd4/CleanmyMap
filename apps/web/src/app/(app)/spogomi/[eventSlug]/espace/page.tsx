import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SpogomiEventCockpit } from "@/components/spogomi/spogomi-event-cockpit";
import { getCurrentUserActiveRole, requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasSpogomiCapability, resolveSpogomiEventAccessBySlug } from "@/lib/spogomi/authorization";
import { loadSpogomiFieldOperationsAccess } from "@/lib/spogomi/field-operations-service";

type Props = { params: Promise<{ eventSlug: string }> };

export const metadata: Metadata = {
  title: "Espace événementiel SPOGOMI",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function SpogomiEventSpacePage({ params }: Props) {
  const { eventSlug } = await params;
  const access = await requireAuthenticatedAccess();
  if (!access.ok) redirect(`/sign-in?redirect_url=${encodeURIComponent(`/spogomi/${eventSlug}/espace`)}`);
  const eventAccess = await resolveSpogomiEventAccessBySlug({
    supabase: getSupabaseServerClient(true),
    eventSlug,
    userId: access.userId,
  });
  const fieldOperationsAccess = eventAccess?.event
    ? await loadSpogomiFieldOperationsAccess({ supabase: getSupabaseServerClient(true), eventId: String(eventAccess.event.id), userId: access.userId })
    : await (async () => {
      const eventResult = await getSupabaseServerClient(true).from("spogomi_events").select("id").eq("event_slug", eventSlug).maybeSingle();
      if (eventResult.error || !eventResult.data) return null;
      return loadSpogomiFieldOperationsAccess({ supabase: getSupabaseServerClient(true), eventId: String(eventResult.data.id), userId: access.userId });
    })();
  if ((!eventAccess || (!hasSpogomiCapability(eventAccess, "observe") && !hasSpogomiCapability(eventAccess, "manage") && !hasSpogomiCapability(eventAccess, "checkin"))) && !fieldOperationsAccess) notFound();
  const effectiveEvent = eventAccess?.event ?? fieldOperationsAccess?.event;
  if (!effectiveEvent) notFound();
  const activeRole = await getCurrentUserActiveRole();

  return (
    <>
      <nav className="cmm-page-width flex flex-wrap gap-3 px-4 pt-6" aria-label="Navigation SPOGOMI">
        <Link href="/spogomi/mes-evenements" className="font-bold text-emerald-800 hover:underline">Retour à mes événements</Link>
        <Link href="/spogomi/nouveau" className="font-bold text-emerald-800 hover:underline">Nouvelle compétition</Link>
        <Link href="/spogomi" className="font-bold text-emerald-800 hover:underline">Index public SPOGOMI</Link>
      </nav>
      <SpogomiEventCockpit
        event={{
          id: String(effectiveEvent.id),
          name: String(effectiveEvent.name),
          eventSlug: effectiveEvent.event_slug,
          mode: effectiveEvent.mode,
          state: effectiveEvent.state,
          startsAt: effectiveEvent.starts_at,
          endsAt: effectiveEvent.ends_at,
          officialTimezone: effectiveEvent.official_timezone,
          publicVisibility: effectiveEvent.public_visibility,
        }}
        role={eventAccess?.role ?? null}
        capabilities={eventAccess ? [...eventAccess.capabilities] : []}
        fieldCapabilities={fieldOperationsAccess ? [...fieldOperationsAccess.capabilities] : []}
        activeRole={activeRole}
      />
    </>
  );
}

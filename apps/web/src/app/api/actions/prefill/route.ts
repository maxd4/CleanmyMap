import { auth } from"@clerk/nextjs/server";
import { NextResponse } from"next/server";
import {
 ASSOCIATION_SELECTION_OPTIONS,
 normalizeAssociationSelectionForPrefill,
} from"@/lib/actions/association-options";
import { extractActionMetadataFromNotes } from"@/lib/actions/metadata";
import { getCurrentUserIdentity } from"@/lib/authz";
import { fetchRecentActionsByUser } from"@/lib/actions/store";
import { getSupabaseServerClient } from"@/lib/supabase/server";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";

export const runtime ="nodejs";

function median(values: number[], fallback: number): number {
 if (values.length === 0) {
 return fallback;
 }
 const sorted = [...values].sort((a, b) => a - b);
 const mid = Math.floor(sorted.length / 2);
 if (sorted.length % 2 === 0) {
 return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
 }
 return Math.round(sorted[mid]);
}

export async function GET() {
 const { userId } = await auth();
 if (!userId) {
 return unauthorizedJsonResponse();
 }

 try {
 const supabase = getSupabaseServerClient();
 const identity = await getCurrentUserIdentity();
 const recent = await fetchRecentActionsByUser(supabase, {
 userId,
 limit: 25,
 });

 const locationCounts = new Map<string, number>();
 const associationCounts = new Map<string, number>();
 const volunteersSamples: number[] = [];
 const durationSamples: number[] = [];

 for (const item of recent) {
 const location = item.location_label?.trim();
 if (location) {
 locationCounts.set(location, (locationCounts.get(location) ?? 0) + 1);
 }
 const associationName = extractActionMetadataFromNotes(
 item.notes,
 ).associationName;
 const normalizedAssociation = associationName
 ? normalizeAssociationSelectionForPrefill(associationName)
 : null;
 if (normalizedAssociation) {
 associationCounts.set(
 normalizedAssociation,
 (associationCounts.get(normalizedAssociation) ?? 0) + 1,
 );
 }
 if (Number.isFinite(item.volunteers_count) && item.volunteers_count > 0) {
 volunteersSamples.push(item.volunteers_count);
 }
 if (
 Number.isFinite(item.duration_minutes) &&
 item.duration_minutes >= 0
 ) {
 durationSamples.push(item.duration_minutes);
 }
 }

 const preferredLocation =
 [...locationCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
 const preferredAssociation =
 [...associationCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
 ASSOCIATION_SELECTION_OPTIONS[0];

 return NextResponse.json({
 status:"ok",
 prefill: {
 actionDate: new Date().toISOString().slice(0, 10),
 actorName: identity?.displayName ?? recent[0]?.actor_name ?? userId,
 associationName: preferredAssociation,
 locationLabel: preferredLocation,
 volunteersCount: median(volunteersSamples, 1),
 durationMinutes: median(durationSamples, 60),
 },
 basedOn: { recentDeclarations: recent.length },
 });
 } catch (error) {
 const message = error instanceof Error ? error.message :"Unknown error";
 return NextResponse.json({ error: message }, { status: 500 });
 }
}

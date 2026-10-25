import { NextResponse } from"next/server";
import {
 listPublishedPartnerAnnuaireEntries,
 type PublishedPartnerAnnuaireEntry,
} from"@/lib/partners/published-annuaire-entries-store";

export const runtime ="nodejs";

export async function GET() {
 try {
  const items = await listPublishedPartnerAnnuaireEntries({
   publicationStatus: "accepted",
  });
  const visibleItems = items
  .filter((item) => item.publicationStatus === "accepted")
 .map((item) => stripPublicationMetadata(item));
 return NextResponse.json({
 status:"ok",
 count: visibleItems.length,
 items: visibleItems,
 }, {
  headers: {
    // Cache/no-store justification: the public directory is assembled from
    // mutable publication state and must not be served from a shared cache.
    "Cache-Control": "no-store",
  },
 });
 } catch (error) {
 console.warn("Published partner directory load failed", error);
 return NextResponse.json({
  status:"error",
  code:"published_directory_unavailable",
  message:"L'annuaire partenaire est temporairement indisponible.",
 }, {
  status: 503,
  headers: { "Cache-Control": "no-store" },
 });
 }
}

function stripPublicationMetadata(entry: PublishedPartnerAnnuaireEntry) {
  const {
    sourceRequestId,
    publishedAt,
    publicationStatus,
    source,
    reviewedAt,
    reviewedByUserId,
    internalAdminContact,
    recentActivityAt,
    ...rest
  } = entry;
 void sourceRequestId;
 void publishedAt;
 void publicationStatus;
 void source;
 void reviewedAt;
 void reviewedByUserId;
  void internalAdminContact;
  void recentActivityAt;
 return rest;
}

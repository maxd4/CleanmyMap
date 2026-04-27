import { NextResponse } from"next/server";
import {
 listPublishedPartnerAnnuaireEntries,
 type PublishedPartnerAnnuaireEntry,
} from"@/lib/partners/published-annuaire-entries-store";

export const runtime ="nodejs";

export async function GET() {
 try {
 const items = await listPublishedPartnerAnnuaireEntries();
 const visibleItems = items
 .filter((item) => item.publicationStatus ==="accepted")
 .map((item) => stripPublicationMetadata(item));
 return NextResponse.json({
 status:"ok",
 count: visibleItems.length,
 items: visibleItems,
 });
 } catch (error) {
 console.warn("Published partner directory load failed", error);
 return NextResponse.json({
 status:"ok",
 count: 0,
 items: [],
 });
 }
}

function stripPublicationMetadata(entry: PublishedPartnerAnnuaireEntry) {
 const { sourceRequestId, publishedAt, publicationStatus, source, reviewedAt, reviewedByUserId, ...rest } = entry;
 void sourceRequestId;
 void publishedAt;
 void publicationStatus;
 void source;
 void reviewedAt;
 void reviewedByUserId;
 return rest;
}

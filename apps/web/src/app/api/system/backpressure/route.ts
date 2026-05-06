import { NextResponse } from "next/server";
import { getBackpressureStatus } from "@/lib/backpressure";

export const runtime = "nodejs";

export async function GET() {
  const importStatus = getBackpressureStatus("import");
  const batchStatus = getBackpressureStatus("batch");
  const eventStatus = getBackpressureStatus("event");

  return NextResponse.json({
    import: importStatus,
    batch: batchStatus,
    event: eventStatus,
    timestamp: Date.now(),
  });
}
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { organizationReportScopeSchema } from "@/lib/organizations/contracts";
import { OrganizationServiceError } from "@/lib/organizations/service";
import { loadOrganizationReport } from "@/lib/organizations/report";
import { summarizeOrganizationReport } from "@/lib/organizations/report-summary";
import { escapeCsvCell } from "@/lib/reports/csv";

// Justification: private organization reports depend on the verified session and must never be cached.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const schema = z.object({ scope: organizationReportScopeSchema, actionId: z.string().uuid().optional(), format: z.enum(["summary","csv"]) }).strict();
function json(body: unknown,status=200) { return NextResponse.json(body,{status,headers}); }
export async function POST(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return json({error:"Connexion requise."},401);
  const rate = await enforceServerRateLimitForAuthenticatedUser(request,access.userId,{limit:10,window:60});
  if (rate) { rate.headers.set("Cache-Control","private, no-store"); return rate; }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({error:"Périmètre invalide."},400);
  try {
    const rows = await loadOrganizationReport(access.userId,parsed.data.scope,parsed.data.actionId);
    if (parsed.data.format === "summary") return json(summarizeOrganizationReport(rows));
    const columns = ["date","massKg","impactMassKg","massSource","butts","participations","durationMinutes"] as const;
    const csv = [columns.join(","),...rows.map(row=>columns.map(key=>escapeCsvCell(String(row[key] ?? ""))).join(","))].join("\r\n");
    return new Response(csv,{headers:{...headers,"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=cleanmymap-bilan-entreprise.csv"}});
  } catch (error) {
    const status = error instanceof OrganizationServiceError ? error.status : 503;
    return json({error:status===403?"Périmètre non autorisé.":status===409?"Périmètre trop large ou modifié. Réduisez la période ou actualisez.":"Bilan indisponible."},status);
  }
}

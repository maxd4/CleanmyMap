import { buildDeliverableHeaders } from "@/lib/reports/http";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  ELUS_DOSSIER_BUCKET,
  ELUS_DOSSIER_PDF_REDIRECT_CACHE_CONTROL,
} from "./route-scope";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdminClient>;

export async function buildCachedPdfResponse(
  supabase: SupabaseAdminClient,
  cachedPdfPath: string,
): Promise<Response> {
  const cachedExport = await supabase
    .from("reports")
    .select("file_path")
    .eq("file_path", cachedPdfPath)
    .eq("file_kind", "pdf")
    .order("created_at", { ascending: false })
    .limit(1);

  if (!cachedExport.error && cachedExport.data?.length > 0) {
    const { filename } = buildDeliverableHeaders({
      rubrique: "reports_elus_dossier",
      extension: "pdf",
      contentType: "application/pdf",
    });
    const signedPdf = await supabase.storage.from(ELUS_DOSSIER_BUCKET).createSignedUrl(
      cachedPdfPath,
      60 * 60 * 24,
      { download: filename },
    );

    if (!signedPdf.error && signedPdf.data?.signedUrl) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: signedPdf.data.signedUrl,
          "Cache-Control": ELUS_DOSSIER_PDF_REDIRECT_CACHE_CONTROL,
        },
      });
    }
  }

  return new Response(
    JSON.stringify({
      error:
        "Le PDF de dossier élus est désormais généré côté navigateur. Utilisez l'export PDF depuis la page de rapports.",
    }),
    {
      status: 409,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

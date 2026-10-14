import { getSupabaseAdminClient } from "@/lib/supabase/server";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdminClient>;

export async function buildCachedPdfResponse(
  _supabase: SupabaseAdminClient,
  _cachedPdfPath: string,
): Promise<Response> {
  void _supabase;
  void _cachedPdfPath;

  // Legacy `reports.file_path` rows do not bind a PDF to the requested scope,
  // its aggregate payload, or the caller. Never turn a predictable path into
  // a signed private Storage URL. The supported PDF contract is the existing
  // browser-side generation flow.
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

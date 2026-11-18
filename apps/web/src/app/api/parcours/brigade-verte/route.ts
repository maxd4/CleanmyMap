/**
 * Projection personnelle du parcours Éco-Citoyen Brigade Verte Paris.
 *
 * OWNER : apps/web/src/app/api/parcours/brigade-verte/
 *
 * INVARIANTS :
 * - Authentifié, owner-scoped.
 * - Cache-Control: private, no-store systématique.
 * - Fail-closed : une indisponibilité renvoie status: "error", JAMAIS count: 0.
 * - Aucune fuite d'identités tierces ou de commentaires administratifs.
 * - Aucun badge, XP ou gamification n'est créé.
 */

import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { computeBrigadeVerteProgress } from "@/lib/brigade-verte/brigade-verte-service";

export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store",
};

export async function GET(): Promise<Response> {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }

  const { eligible, count, proofs } = await computeBrigadeVerteProgress(access.userId);

  // Échec fermé : si la base ou le calcul a rencontré une erreur
  if (!eligible) {
    return NextResponse.json(
      {
        status: "error",
        message: "Impossible de charger la progression Brigade Verte actuellement.",
      },
      {
        status: 200,
        headers: CACHE_HEADERS,
      },
    );
  }

  // Si l'utilisateur n'a aucune participation ou si le programme est vide
  if (count === 0 && proofs.length === 0) {
    return NextResponse.json(
      {
        status: "available",
        count: 0,
        proofs: [],
      },
      {
        status: 200,
        headers: CACHE_HEADERS,
      },
    );
  }

  return NextResponse.json(
    {
      status: "available",
      count,
      proofs,
    },
    {
      status: 200,
      headers: CACHE_HEADERS,
    },
  );
}

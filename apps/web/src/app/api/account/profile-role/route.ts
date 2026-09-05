import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";

/**
 * Legacy endpoint intentionally retired: a persona is UX state and must be
 * changed through /api/account/active-profile. A role is authorization state
 * and is never self-selected from an account UI.
 */
export async function POST() {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  return NextResponse.json(
    {
      error:
        "Cette route ne modifie plus le rôle. Utilisez la mutation de profil actif.",
    },
    { status: 410 },
  );
}

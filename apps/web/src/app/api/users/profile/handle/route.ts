import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";

const updateHandleSchema = z.object({
  handle: z.string()
    .min(3, "Trop court (min 3 car.)")
    .max(30, "Trop long (max 30 car.)")
    .regex(/^[a-z0-9_]+$/, "Seuls les lettres minuscules, chiffres et underscores sont autorisés"),
});

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateHandleSchema.safeParse(payload);
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);

  const supabase = getSupabaseAdminClient();

  try {
    // Check uniqueness
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("handle", parsed.data.handle)
      .not("id", "eq", userId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ 
        error: "Ce handle est déjà utilisé par un autre membre." 
      }, { status: 409 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({ handle: parsed.data.handle, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) return handleApiError(error, "PATCH /api/users/profile/handle");

    return NextResponse.json({ status: "updated", handle: parsed.data.handle });
  } catch (error) {
    return handleApiError(error, "PATCH /api/users/profile/handle (general)");
  }
}

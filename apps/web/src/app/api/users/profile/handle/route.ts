import { auth } from"@clerk/nextjs/server";
import { NextResponse } from"next/server";
import { z } from"zod";
import { getSupabaseClerkRlsClient } from"@/lib/supabase/clerk-rls";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from"@/lib/http/api-errors";

const updateHandleSchema = z.object({
 handle: z.string()
 .min(3,"Trop court (min 3 car.)")
 .max(30,"Trop long (max 30 car.)")
 .regex(/^[a-z0-9_]+$/,"Seuls les lettres minuscules, chiffres et underscores sont autorisés"),
});

export async function PATCH(request: Request) {
 const { userId } = await auth();
 if (!userId) return unauthorizedJsonResponse();

 let payload: unknown;
 try {
 payload = await request.json();
 } catch {
 return NextResponse.json({ error:"Invalid JSON" }, { status: 400 });
 }

 const parsed = updateHandleSchema.safeParse(payload);
 if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);

 const supabase = await getSupabaseClerkRlsClient();
 if (!supabase) {
 return NextResponse.json(
 {
 error:"Connexion sécurisée indisponible",
 hint:"Activez l'intégration native Clerk/Supabase et vérifiez que la session Clerk est disponible.",
 },
 { status: 503 },
 );
 }

 try {
 const { count, error: existingError } = await supabase
 .from("profiles")
 .select("id", { count: "exact", head: true })
 .eq("handle", parsed.data.handle)
 .neq("id", userId);

 if (existingError) return handleApiError(existingError,"PATCH /api/users/profile/handle (handle check)");

 if ((count ?? 0) > 0) {
 return NextResponse.json({ 
 error:"Ce handle est déjà utilisé par un autre membre." 
 }, { status: 409 });
 }

 const { error } = await supabase
 .from("profiles")
 .update({ handle: parsed.data.handle, updated_at: new Date().toISOString() })
 .eq("id", userId);

 if (error) return handleApiError(error,"PATCH /api/users/profile/handle");

 return NextResponse.json({ status:"updated", handle: parsed.data.handle });
 } catch (error) {
 return handleApiError(error,"PATCH /api/users/profile/handle (general)");
 }
}

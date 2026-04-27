import { auth, clerkClient } from"@clerk/nextjs/server";
import { NextResponse } from"next/server";
import { z } from"zod";
import { DISPLAY_MODES } from"@/lib/ui/preferences";

const requestSchema = z.object({
 displayMode: z.enum(DISPLAY_MODES),
});

export async function POST(request: Request) {
 const session = await auth().catch(() => null);
 if (!session) {
 return NextResponse.json(
 { error:"Service d'authentification temporairement indisponible." },
 { status: 503 },
 );
 }
 if (!session.userId) {
 return NextResponse.json({ error:"Unauthorized" }, { status: 401 });
 }

 const parsed = requestSchema.safeParse(await request.json().catch(() => null));
 if (!parsed.success) {
 return NextResponse.json(
 { error:"Mode d'affichage invalide." },
 { status: 400 },
 );
 }

 try {
 const client = await clerkClient();
 const currentUser = await client.users.getUser(session.userId);
 await client.users.updateUser(session.userId, {
 unsafeMetadata: {
 ...(currentUser.unsafeMetadata as Record<string, unknown>),
 displayMode: parsed.data.displayMode,
 },
 });
 } catch (error) {
 console.error("Display mode persistence failed", error);
 return NextResponse.json(
 { error:"Impossible de synchroniser le mode d'affichage pour le moment." },
 { status: 503 },
 );
 }

 return NextResponse.json({
 displayMode: parsed.data.displayMode,
 });
}

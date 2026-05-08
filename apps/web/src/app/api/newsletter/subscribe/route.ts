import { NextResponse } from"next/server";
import { z } from"zod";
import { getSupabaseServerClient } from"@/lib/supabase/server";
import { verifyRateLimit, createServerRateLimitResponse } from"@/lib/rate-limit/server";
import {
  createPublicRateLimitResponse,
  hasHoneypotSignal,
  hasRecentSubmission,
} from"@/lib/security/validation";

const subscribeSchema = z.object({
 email: z.string().trim().email("Format d'email invalide"),
 gdprConsent: z.literal(true,"Le consentement RGPD est obligatoire"),
 source: z.string().optional().default("landing"),
 honeypot: z.string().optional().default(""),
 submittedAt: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  try {
    let rawData: unknown;
    try {
      rawData = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    const validated = subscribeSchema.safeParse(rawData);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, gdprConsent, source, honeypot, submittedAt } = validated.data;
    if (hasHoneypotSignal(honeypot)) {
      return createPublicRateLimitResponse("Impossible de vous inscrire pour le moment.");
    }

    if (hasRecentSubmission(submittedAt)) {
      return createPublicRateLimitResponse("Impossible de vous inscrire pour le moment.");
    }

    const normalizedEmail = email.toLowerCase();
    const rateLimit = await verifyRateLimit({
      limit: 5,
      window: 60,
      key: normalizedEmail,
    });

    const rateLimitResponse = createServerRateLimitResponse(rateLimit.allowed, rateLimit.retryAfter);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const supabase = getSupabaseServerClient(true); // Use service role for subscription

    const { data: existing, error: lookupError } = await supabase
      .from("newsletter_subscriptions")
      .select("email, status")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (lookupError) {
      console.error("[Newsletter API] Lookup error:", lookupError);
      return NextResponse.json(
        { error:"Impossible de s'abonner pour le moment" },
        { status: 500 }
      );
    }

    if (existing?.status === "active") {
      return NextResponse.json({
        status:"ok",
        message:"Vous êtes déjà inscrit à la newsletter.",
      });
    }

    const { error } = await supabase
      .from("newsletter_subscriptions")
      .upsert(
        { email: normalizedEmail, gdpr_consent: gdprConsent, source, status:"active" },
        { onConflict:"email" }
      );

    if (error) {
      console.error("[Newsletter API] Database error:", error);
      return NextResponse.json(
        { error:"Impossible de s'abonner pour le moment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status:"ok",
      message:"Inscription réussie (Sobriété numérique activée : aucun mail envoyé)",
    });
  } catch (error) {
    console.error("[Newsletter API] Runtime error:", error);
    return NextResponse.json({ error:"Internal Server Error" }, { status: 500 });
  }
}

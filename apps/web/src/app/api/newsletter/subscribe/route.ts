import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const subscribeSchema = z.object({
  email: z.string().email("Format d'email invalide"),
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: "Le consentement RGPD est obligatoire" }),
  }),
  source: z.string().optional().default("landing"),
});

export async function POST(request: Request) {
  try {
    const rawData = await request.json();
    const validated = subscribeSchema.safeParse(rawData);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, gdprConsent, source } = validated.data;
    const supabase = getSupabaseServerClient(true); // Use service role for subscription

    const { error } = await supabase
      .from("newsletter_subscriptions")
      .upsert(
        { email, gdpr_consent: gdprConsent, source, status: "active" },
        { onConflict: "email" }
      );

    if (error) {
      console.error("[Newsletter API] Database error:", error);
      return NextResponse.json(
        { error: "Impossible de s'abonner pour le moment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "ok",
      message: "Inscription réussie (Sobriété numérique activée : aucun mail envoyé)",
    });
  } catch (error) {
    console.error("[Newsletter API] Runtime error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { getStripeClient } from "@/lib/services/stripe";
import { createRateLimitedHandler } from "@/lib/rate-limit/api-wrapper";
import {
  FUNDING_CATEGORY_LABELS,
  MAX_FUNDING_AMOUNT_CENTS,
  MIN_FUNDING_AMOUNT_CENTS,
  isFundingCategory,
} from "@/lib/funding/config";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 10_000;
const checkoutPayloadSchema = z
  .object({
    category: z.string().refine(isFundingCategory, "Catégorie de soutien inconnue."),
    amountCents: z
      .number({ message: "Le montant est invalide." })
      .int("Le montant doit être un nombre entier de centimes.")
      .min(MIN_FUNDING_AMOUNT_CENTS)
      .max(MAX_FUNDING_AMOUNT_CENTS),
  })
  .strict();

async function createCheckout(request: NextRequest) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload trop volumineux." }, { status: 413 });
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload trop volumineux." }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Payload JSON invalide." }, { status: 400 });
  }

  const parsed = checkoutPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Catégorie ou montant invalide." }, { status: 400 });
  }

  const stripe = getStripeClient();
  if (!stripe || !env.NEXT_PUBLIC_APP_URL) {
    return NextResponse.json({ error: "Le paiement Stripe n’est pas configuré." }, { status: 503 });
  }

  const category = parsed.data.category;
  const label = FUNDING_CATEGORY_LABELS[category];
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: `Soutien CleanMyMap — ${label.fr}` },
            unit_amount: parsed.data.amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${env.NEXT_PUBLIC_APP_URL}/sections/funding?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/sections/funding?status=cancelled`,
      metadata: { funding_category: category },
      payment_intent_data: { metadata: { funding_category: category } },
    });
  } catch (error) {
    console.error("[Funding] Stripe session creation failed", error);
    return NextResponse.json(
      { error: "Le paiement est temporairement indisponible." },
      { status: 502 },
    );
  }

  if (!session.url) {
    console.error("[Funding] Stripe Checkout session has no URL", { sessionId: session.id });
    return NextResponse.json({ error: "La redirection Stripe est indisponible." }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}

export const POST = createRateLimitedHandler({
  POST: createCheckout,
}, { customLimit: 12, customWindow: 60 });

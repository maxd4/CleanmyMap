import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { getStripeClient } from "@/lib/services/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { isFundingCategory } from "@/lib/funding/config";

export const runtime ="nodejs";

function stripeId(value: string | Stripe.PaymentIntent | null | undefined): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

async function applyCheckoutCompleted(event: Stripe.Event, session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;
  const category = session.metadata?.funding_category;
  const paymentIntentId = stripeId(session.payment_intent);
  if (!isFundingCategory(category) || !paymentIntentId || !session.amount_total || session.amount_total <= 0) {
    throw new Error("Incomplete funding Checkout metadata");
  }

  const { error } = await getSupabaseAdminClient().rpc("apply_funding_checkout", {
    p_event_id: event.id,
    p_session_id: session.id,
    p_payment_intent_id: paymentIntentId,
    p_category: category,
    p_amount_total_cents: session.amount_total,
    p_currency: session.currency ?? "eur",
    p_paid_at: new Date(event.created * 1000).toISOString(),
  });
  if (error) throw error;
}

async function applyChargeRefunded(event: Stripe.Event, charge: Stripe.Charge) {
  const paymentIntentId = stripeId(charge.payment_intent);
  if (!paymentIntentId || charge.amount_refunded < 0) {
    throw new Error("Incomplete funding refund metadata");
  }

  const { error } = await getSupabaseAdminClient().rpc("apply_funding_refund", {
    p_event_id: event.id,
    p_payment_intent_id: paymentIntentId,
    p_amount_refunded_cents: charge.amount_refunded,
    p_currency: charge.currency ?? "eur",
    p_refunded_at: new Date(event.created * 1000).toISOString(),
  });
  if (error) throw error;
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 503 });
  }

  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (error) {
    console.error("[Stripe Webhook] Signature verification failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await applyCheckoutCompleted(event, event.data.object as Stripe.Checkout.Session);
    } else if (event.type === "charge.refunded") {
      await applyChargeRefunded(event, event.data.object as Stripe.Charge);
    }
    return NextResponse.json({ received: true, type: event.type });
  } catch (error) {
    console.error("[Stripe Webhook] Funding event processing failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Webhook processing unavailable" }, { status: 500 });
  }
}

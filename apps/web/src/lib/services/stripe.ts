import Stripe from "stripe";
import { env } from "@/lib/env";

let stripe: Stripe | null = null;

export function getStripeClient() {
  if (!env.STRIPE_SECRET_KEY) return null;
  if (stripe) return stripe;

  stripe = new Stripe(env.STRIPE_SECRET_KEY);
  return stripe;
}

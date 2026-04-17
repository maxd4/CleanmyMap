import { z } from "zod";

const emptyToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }
  return value;
};

function normalizeUrlCandidate(raw: string): string {
  const value = raw.trim();
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(value)) {
    return value;
  }
  if (value.startsWith("localhost") || value.startsWith("127.0.0.1")) {
    return `http://${value}`;
  }
  return `https://${value}`;
}

const optionalUrl = z.preprocess((value) => {
  const normalized = emptyToUndefined(value);
  if (typeof normalized !== "string") {
    return normalized;
  }
  return normalizeUrlCandidate(normalized);
}, z.string().url().optional());

const optionalBoolean = z.preprocess((value) => {
  const normalized = emptyToUndefined(value);
  if (typeof normalized === "boolean" || normalized === undefined) {
    return normalized;
  }
  if (typeof normalized === "string") {
    const lower = normalized.trim().toLowerCase();
    if (lower === "true") {
      return true;
    }
    if (lower === "false") {
      return false;
    }
  }
  return normalized;
}, z.boolean().optional());

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: optionalUrl,
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,

  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_ADMIN_USER_IDS: z.string().optional(),
  CLERK_ALLOWED_PARTIES: z.string().optional(),
  CLERK_DOMAIN: z.string().optional(),
  CLERK_IS_SATELLITE: optionalBoolean,
  CLERK_SATELLITE_AUTO_SYNC: optionalBoolean,
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SENTRY_DSN: optionalUrl,
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PINECONE_API_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  QSTASH_TOKEN: z.string().optional(),
  ALLOW_LOCAL_FILE_STORE_FALLBACK: optionalBoolean,
  ALLOW_LOCAL_ACTION_STORE_IN_PROD: optionalBoolean,
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // Fail fast in server contexts while keeping local DX understandable.
  console.error(
    "Invalid environment configuration",
    parsed.error.flatten().fieldErrors,
  );
}

export const env = parsed.success
  ? parsed.data
  : (process.env as z.infer<typeof envSchema>);

export function isConfigured(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

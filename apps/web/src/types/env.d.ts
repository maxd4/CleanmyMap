/* eslint-disable @typescript-eslint/no-unused-vars */

declare namespace NodeJS {
  interface ProcessEnv {
    CLEANMYMAP_SHEET_URL?: string;
    CI?: string;
    CLERK_ALLOWED_PARTIES?: string;
    CLERK_ADMIN_USER_IDS?: string;
    CLERK_DOMAIN?: string;
    CLERK_IS_SATELLITE?: string;
    CLERK_MAX_USER_IDS?: string;
    CLERK_SATELLITE_AUTO_SYNC?: string;
    CLERK_SECRET_KEY?: string;
    CLOUDFLARE_API_TOKEN?: string;
    CONTACT_EMAIL?: string;
    EMAIL_FROM?: string;
    IMPACT_PROXY_CO2_KG_PER_WASTE_KG?: string;
    IMPACT_PROXY_SURFACE_M2_PER_VOLUNTEER_MINUTE?: string;
    IMPACT_PROXY_SURFACE_M2_PER_WASTE_KG?: string;
    IMPACT_PROXY_VERSION?: string;
    IMPACT_PROXY_WATER_LITERS_PER_CIGARETTE_BUTT?: string;
    NEXT_PUBLIC_APP_URL?: string;
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
    NEXT_PUBLIC_CONTACT_EMAIL?: string;
    NEXT_PUBLIC_POSTHOG_HOST?: string;
    NEXT_PUBLIC_POSTHOG_KEY?: string;
    NEXT_PUBLIC_POSTHOG_REGION?: "eu" | "us";
    NEXT_PUBLIC_POSTHOG_TOKEN?: string;
    NEXT_PUBLIC_SENTRY_DSN?: string;
    NEXT_PUBLIC_SITE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NODE_ENV?: "development" | "production" | "test";
    PINECONE_API_KEY?: string;
    QSTASH_TOKEN?: string;
    RESEND_API_KEY?: string;
    RESEND_FROM_EMAIL?: string;
    RESEND_REPLY_TO?: string;
    RESEND_TEST_TOKEN?: string;
    CRON_SECRET?: string;
    SUPABASE_STORAGE_QUOTA_BYTES?: string;
    SUPABASE_STORAGE_QUOTA_GB?: string;
    SENTRY_AUTH_TOKEN?: string;
    SENTRY_DSN?: string;
    SENTRY_ORG?: string;
    SENTRY_PROJECT?: string;
    SENTRY_RELEASE?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    UPTIMEROBOT_API_KEY?: string;
    UPSTASH_REDIS_REST_TOKEN?: string;
    UPSTASH_REDIS_REST_URL?: string;
    VERCEL?: string;
    VERCEL_ENV?: string;
    VERCEL_GIT_COMMIT_REF?: string;
    VISION_TRAINING_ENABLED?: string;
  }
}

export {};

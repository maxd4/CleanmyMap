/* eslint-disable @typescript-eslint/no-unused-vars */

declare namespace NodeJS {
  interface ProcessEnv {
    CI?: string;
    CMM_DEV_AUTH_BYPASS?: string;
    CMM_DEV_AUTH_BYPASS_DISPLAY_NAME?: string;
    CMM_DEV_AUTH_BYPASS_ROLE?: string;
    CMM_DEV_AUTH_BYPASS_USER_ID?: string;
    CMM_DEV_AUTH_BYPASS_USERNAME?: string;
    CMM_DISABLE_DEV_AUTH_BYPASS?: string;
    CLERK_ALLOWED_PARTIES?: string;
    CLERK_ADMIN_USER_IDS?: string;
    CLERK_DOMAIN?: string;
    CLERK_IS_SATELLITE?: string;
    CLERK_MAX_USER_IDS?: string;
    CLERK_SATELLITE_AUTO_SYNC?: string;
    CLERK_SECRET_KEY?: string;
    CLOUDFLARE_API_TOKEN?: string;
    CONTACT_EMAIL?: string;
    CREATOR_INBOX_EMAIL?: string;
    EMAIL_FROM?: string;
    GH_TOKEN?: string;
    GITHUB_API_TOKEN?: string;
    GITHUB_TOKEN?: string;
    GIT_COMMIT_SHA?: string;
    IMPORT_DRY_RUN_SECRET?: string;
    IMPACT_PROXY_CO2_KG_PER_WASTE_KG?: string;
    IMPACT_PROXY_SURFACE_M2_PER_VOLUNTEER_MINUTE?: string;
    IMPACT_PROXY_SURFACE_M2_PER_WASTE_KG?: string;
    IMPACT_PROXY_VERSION?: string;
    IMPACT_PROXY_WATER_LITERS_PER_CIGARETTE_BUTT?: string;
    NEXT_PUBLIC_APP_URL?: string;
    NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE?: string;
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
    NEXT_PUBLIC_CLERK_PROXY_URL?: string;
    NEXT_PUBLIC_CONTACT_EMAIL?: string;
    NEXT_PUBLIC_ENABLE_SUPABASE_CHAT_REALTIME?: string;
    NEXT_PUBLIC_GAMIFICATION_WS?: string;
    NEXT_PUBLIC_POSTHOG_HOST?: string;
    NEXT_PUBLIC_POSTHOG_KEY?: string;
    NEXT_PUBLIC_POSTHOG_REGION?: "eu" | "us";
    NEXT_PUBLIC_POSTHOG_TOKEN?: string;
    NEXT_PUBLIC_SENTRY_DSN?: string;
    NEXT_PUBLIC_SENTRY_RELEASE?: string;
    NEXT_PUBLIC_SENTRY_ENVIRONMENT?: "production" | "preview" | "development";
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NODE_ENV?: "development" | "production" | "test";
    ALLOW_LOCAL_ACTION_STORE_IN_PROD?: string;
    ALLOW_LOCAL_FILE_STORE_FALLBACK?: string;
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
    SENTRY_ENVIRONMENT?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    UPTIMEROBOT_API_KEY?: string;
    UPSTASH_REDIS_REST_TOKEN?: string;
    UPSTASH_REDIS_REST_URL?: string;
    VERCEL?: string;
    VERCEL_ENV?: string;
    VISION_TRAINING_ENABLED?: string;
  }
}

export {};

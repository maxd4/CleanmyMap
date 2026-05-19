import path from "path";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const appRoot = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: appRoot,
  compress: true,
  generateEtags: true,
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@clerk/nextjs',
      'date-fns',
      'zod',
      '@supabase/supabase-js',
    ],
  },
  async headers() {
    const isProduction = process.env.NODE_ENV === "production";

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/:path*.svg",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
    ];
  },
};

const sentryEnabled = process.env["NEXT_PUBLIC_SENTRY_ENABLED"] === "1";
const sentryBuildPluginEnabled = process.env["SENTRY_BUILD_PLUGIN"] === "1" && sentryEnabled;

export default sentryBuildPluginEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env["SENTRY_ORG"],
      project: process.env["SENTRY_PROJECT"],
      silent: !process.env["CI"],
      telemetry: false,
    })
  : nextConfig;

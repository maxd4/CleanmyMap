import path from "path";
import type { NextConfig } from "next";

const repoRoot = path.resolve(__dirname, "../..");
const appRoot = path.resolve(__dirname);
const env = process.env;
const isProduction = env["NODE_ENV"] === "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: repoRoot,
  serverExternalPackages: ["@prisma/instrumentation", "@fastify/otel"],
  compress: true,
  generateEtags: true,
  poweredByHeader: false,
  distDir: env["NEXT_DIST_DIR"] ?? ".next",
  typescript: {
    tsconfigPath: env["NEXT_TSCONFIG_PATH"] ?? "tsconfig.json",
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    lockDistDir: false,
    serverSourceMaps: isProduction,
    optimizePackageImports: [
      'lucide-react',
      '@clerk/nextjs',
      'date-fns',
      'zod',
      '@supabase/supabase-js',
    ],
  },
  turbopack: {
    root: repoRoot,
  },
  productionBrowserSourceMaps:
    Boolean(env["SENTRY_AUTH_TOKEN"]) &&
    Boolean(env["SENTRY_ORG"]) &&
    Boolean(env["SENTRY_PROJECT"]),
  async headers() {
    const headers = [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "X-Download-Options", value: "noopen" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },
        ],
      },
      {
        source: "/brand/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        source: "/favicon.svg",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];

    return headers;
  },
};

export default nextConfig;

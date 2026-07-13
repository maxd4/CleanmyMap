import path from "path";
import type { NextConfig } from "next";

const repoRoot = path.resolve(__dirname, "../..");
const env = process.env;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
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
    remotePatterns: [
      { protocol: "https", hostname: "www.artchive.com" },
      { protocol: "https", hostname: "images.squarespace-cdn.com" },
      { protocol: "https", hostname: "commons.wikimedia.org" },
      { protocol: "https", hostname: "media.wired.com" },
      { protocol: "https", hostname: "www.veronikarichterova.com" },
      { protocol: "https", hostname: "ocean.si.edu" },
      { protocol: "https", hostname: "i0.wp.com" },
    ],
  },
  experimental: {
    lockDistDir: false,
    serverSourceMaps: false,

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
  webpack: (config, { dev }) => {
    // Let Next.js handle devtool for production to allow source maps
    if (dev) {
      config.devtool = "eval-source-map";
    }
    return config;
  },
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

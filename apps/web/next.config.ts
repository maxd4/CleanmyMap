import path from "path";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const appRoot = process.env.VERCEL
  ? __dirname
  : path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: appRoot,
  turbopack: {
    root: appRoot,
  },
};

const sentryBuildPluginEnabled = process.env.SENTRY_BUILD_PLUGIN === "1";

export default sentryBuildPluginEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      telemetry: false,
    })
  : nextConfig;

import path from "path";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const appRoot = path.resolve(__dirname);

function ensureDeterministicRoutesManifest(): void {
  const appNextDir = path.resolve(appRoot, ".next");
  const repoNextDir = path.resolve(appRoot, "..", "..", ".next");

  const sourceCandidates = [path.resolve(appNextDir, "routes-manifest.json"), path.resolve(repoNextDir, "routes-manifest.json")];
  const sourcePath = sourceCandidates.find((candidate) => existsSync(candidate));
  if (!sourcePath) {
    return;
  }

  const targetPaths = [path.resolve(appNextDir, "routes-manifest-deterministic.json"), path.resolve(repoNextDir, "routes-manifest-deterministic.json")];
  for (const targetPath of targetPaths) {
    try {
      mkdirSync(path.dirname(targetPath), { recursive: true });
      copyFileSync(sourcePath, targetPath);
    } catch {
      // Ignore copy failures to avoid breaking production builds.
    }
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: appRoot,
  turbopack: {
    root: appRoot,
  },
  webpack(config, { dev, isServer }) {
    if (!dev && isServer) {
      const pluginName = "EnsureDeterministicRoutesManifestPlugin";
      config.plugins = config.plugins ?? [];
      config.plugins.push({
        apply(compiler: { hooks: { done: { tap: (name: string, cb: () => void) => void } } }) {
          compiler.hooks.done.tap(pluginName, () => {
            ensureDeterministicRoutesManifest();
          });
        },
      });
    }
    return config;
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

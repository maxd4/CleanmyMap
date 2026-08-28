import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { verifyVercelStaticLambdaFallback } from "./verify-vercel-static-lambda-fallback.mjs";

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

function createFixture() {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cmm-vercel-guard-"));
  const nextRoot = path.join(projectRoot, "apps/web/.next");

  writeJson(path.join(nextRoot, "prerender-manifest.json"), {
    routes: {
      "/actions/map": {
        routeType: "page",
        response: "complete",
        compute: "static",
        initialRevalidateSeconds: 3600,
      },
    },
  });
  writeJson(path.join(nextRoot, "routes-manifest.json"), {
    staticRoutes: [{ page: "/actions/map" }],
  });
  writeJson(path.join(nextRoot, "app-path-routes-manifest.json"), {
    "/(app)/actions/map/page": "/actions/map",
  });
  writeJson(path.join(nextRoot, "required-server-files.json"), {
    config: { cacheComponents: false, experimental: { ppr: false } },
  });
  fs.mkdirSync(path.join(nextRoot, "server/app/(app)/actions/map"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(nextRoot, "server/app/(app)/actions/map/page.js"),
    "generated",
    "utf8",
  );
  fs.mkdirSync(path.join(nextRoot, "server/app/actions"), { recursive: true });
  fs.writeFileSync(path.join(nextRoot, "server/app/actions/map.html"), "generated", "utf8");
  writeJson(path.join(projectRoot, ".vercel/output/builds.json"), {
    error: {
      code: "NEXT_MISSING_LAMBDA",
      message: "Unable to find lambda for route: /actions/map",
    },
  });

  return projectRoot;
}

test("accepts only a static non-PPR missing-lambda result", () => {
  const projectRoot = createFixture();
  try {
    assert.deepEqual(verifyVercelStaticLambdaFallback({ projectRoot }), {
      route: "/actions/map",
      classification: "STATIC",
      initialRevalidateSeconds: 3600,
      ppr: false,
      errorCode: "NEXT_MISSING_LAMBDA",
    });
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("rejects a PPR-marked route instead of masking it", () => {
  const projectRoot = createFixture();
  try {
    const manifestPath = path.join(
      projectRoot,
      "apps/web/.next/prerender-manifest.json",
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    manifest.routes["/actions/map"].renderingMode = "PARTIALLY_STATIC";
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`, "utf8");

    assert.throws(
      () => verifyVercelStaticLambdaFallback({ projectRoot }),
      /non-static renderingMode/,
    );
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

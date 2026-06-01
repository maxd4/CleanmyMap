import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { chromium } from "playwright";
import {
  clickProfileMenu,
  clickSelector,
  closeCookieBanner,
  openBlockMenu,
  openPreferencesMenu,
  wait as waitAction,
} from "./capture-actions.mjs";
import { screenCaptureRoutes } from "./capture-routes.mjs";

const baseUrl = process.env.BASE_URL?.trim() || "http://localhost:3000";
const desktopViewport = { width: 1440, height: 1200 };
const stagingRoot = path.join(os.tmpdir(), "cmm-pages-site-screen-captures");
const storageStatePath = process.env.SCREENSHOT_STORAGE_STATE?.trim()
  || process.env.CAPTURE_STORAGE_STATE?.trim()
  || process.env.PLAYWRIGHT_STORAGE_STATE?.trim()
  || null;

function resolveOutputPath(filePath) {
  return path.resolve(filePath);
}

function ensureLeadingSlash(route) {
  return route.startsWith("/") ? route : `/${route}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function waitForFonts(page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  });
}

async function waitForPageReady(page) {
  await page.waitForLoadState("domcontentloaded");
  try {
    await page.waitForLoadState("networkidle", { timeout: 7000 });
  } catch {
    // Some pages keep background requests open; continue after the dom is ready.
  }

  await waitForFonts(page);
  await page.waitForTimeout(900);
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const maxDurationMs = 12000;
    const start = performance.now();
    let lastHeight = 0;
    let stableRounds = 0;
    const step = Math.max(480, Math.floor(window.innerHeight * 0.85));

    while (performance.now() - start < maxDurationMs) {
      const height = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
      );

      if (height === lastHeight) {
        stableRounds += 1;
      } else {
        stableRounds = 0;
        lastHeight = height;
      }

      window.scrollBy(0, step);
      await delay(180);

      const bottomReached =
        window.scrollY + window.innerHeight >= height - 4;
      if (bottomReached && stableRounds >= 2) {
        break;
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    await delay(220);
  });

  await page.waitForTimeout(700);
}

async function waitForStability(page) {
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const heights = [];

    for (let index = 0; index < 3; index += 1) {
      heights.push(
        Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
        ),
      );
      await delay(220);
    }

    return heights;
  });
}

async function clickFirstVisible(page, selectors, label) {
  for (const locator of selectors) {
    try {
      const candidate = locator.first();
      if ((await candidate.count()) === 0) {
        continue;
      }

      await candidate.waitFor({ state: "visible", timeout: 1500 });
      await candidate.click({ timeout: 2500 });
      return true;
    } catch {
      // Try the next selector.
    }
  }

  console.warn(`[capture] action skipped: ${label}`);
  return false;
}

async function executeAction(page, action) {
  switch (action.type) {
    case "close-cookie-banner":
      return clickFirstVisible(
        page,
        [
          page.getByRole("button", {
            name: /tout accepter|accepter tout|accepter|accept all|accept/i,
          }),
          page.locator("button").filter({
            hasText: /tout accepter|accepter tout|accepter|accept all|accept/i,
          }),
          page.locator('[data-testid*="cookie" i] button'),
        ],
        "close-cookie-banner",
      );
    case "open-block-menu":
      return clickFirstVisible(
        page,
        [
          page.getByRole("button", {
            name: new RegExp(escapeRegExp(action.blockLabel), "i"),
          }),
          page.locator("button[title]").filter({
            hasText: new RegExp(escapeRegExp(action.blockLabel), "i"),
          }),
        ],
        `open-block-menu:${action.blockLabel}`,
      );
    case "open-preferences-menu":
      return clickFirstVisible(
        page,
        [
          page.getByRole("button", {
            name: /préférences d'affichage et langue|display and language preferences menu/i,
          }),
        ],
        "open-preferences-menu",
      );
    case "click-profile-menu":
      return clickFirstVisible(
        page,
        [
          page.getByRole("button", {
            name: /profil|profile|compte|account|user/i,
          }),
          page.locator('button[aria-label*="profile" i],button[aria-label*="compte" i],button[aria-label*="account" i],button[aria-label*="user" i]'),
        ],
        "click-profile-menu",
      );
    case "click-selector":
      try {
        const candidate = page.locator(action.selector).first();
        await candidate.waitFor({ state: "visible", timeout: 2500 });
        await candidate.click({ timeout: 2500 });
        return true;
      } catch {
        console.warn(`[capture] action skipped: ${action.selector}`);
        return false;
      }
    case "wait":
      await page.waitForTimeout(action.ms);
      return true;
    default:
      return false;
  }
}

async function runActions(page, actions, phase) {
  for (const action of actions) {
    const actionPhase = action.phase ?? "pre";
    if (actionPhase !== phase) {
      continue;
    }

    await executeAction(page, action);
  }
}

async function postProcessPng(sourcePath, targetPath) {
  const image = sharp(sourcePath);
  await image
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: false,
      force: true,
    })
    .toFile(targetPath);
}

async function captureRoute(page, routeConfig) {
  const targetUrl = new URL(ensureLeadingSlash(routeConfig.route), baseUrl).toString();
  const outputPath = resolveOutputPath(routeConfig.outputPath);
  const stagingPath = path.join(
    stagingRoot,
    routeConfig.family,
    routeConfig.slug,
    "desktop.raw.png",
  );

  await ensureDir(path.dirname(outputPath));
  await ensureDir(path.dirname(stagingPath));

  console.log(`[capture] ${routeConfig.route} -> ${outputPath}`);

  await page.setViewportSize(desktopViewport);
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await waitForPageReady(page);
  await runActions(page, routeConfig.actions, "pre");
  await autoScroll(page);
  await runActions(page, routeConfig.actions, "post");
  await waitForStability(page);

  await page.screenshot({
    path: stagingPath,
    fullPage: true,
    animations: "disabled",
    caret: "hide",
    type: "png",
  });

  await postProcessPng(stagingPath, outputPath);
  await fs.rm(stagingPath, { force: true });
}

async function main() {
  await fs.mkdir(stagingRoot, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    baseURL: baseUrl,
    locale: "fr-FR",
    colorScheme: "light",
    viewport: desktopViewport,
    deviceScaleFactor: 1,
    storageState: storageStatePath || undefined,
    hasTouch: false,
    reducedMotion: "reduce",
  });

  const page = await context.newPage();
  page.setDefaultTimeout(8000);

  const results = {
    success: [],
    failed: [],
  };

  try {
    for (const routeConfig of screenCaptureRoutes) {
      try {
        await captureRoute(page, routeConfig);
        results.success.push(routeConfig.route);
      } catch (error) {
        results.failed.push({ route: routeConfig.route, error });
        console.error(`[capture][skip] ${routeConfig.route}: ${error.message}`);
      }
    }
  } finally {
    await context.close();
    await browser.close();
    await fs.rm(stagingRoot, { recursive: true, force: true });
  }

  console.log(`\n✅ Captures réussies: ${results.success.length}`);
  console.log(`❌ Captures échouées: ${results.failed.length}`);

  if (results.failed.length) {
    console.log("\nRoutes en échec:");
    for (const failed of results.failed) {
      console.log(`- ${failed.route}: ${failed.error.message}`);
    }
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

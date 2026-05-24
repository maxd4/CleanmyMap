import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { chromium } from "playwright";

const rootDir = path.resolve("documentation/pages_site");
const indexPath = path.join(rootDir, "README.md");
const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const stagingRoot = path.join(os.tmpdir(), "cmm-pages-site-captures");
const desktopViewport = { width: 1440, height: 1200 };
const mobileViewport = { width: 390, height: 844 };

function decodeMarkdownLabel(value) {
  return value
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractActualRoute(routeLabel) {
  const cleaned = decodeMarkdownLabel(routeLabel);
  const exampleIndex = cleaned.indexOf(" (ex.");
  return exampleIndex >= 0 ? cleaned.slice(0, exampleIndex).trim() : cleaned;
}

function extractReadmeHref(cell) {
  const match = cell.match(/\[[^\]]+\]\(([^)]+)\)/);
  return match?.[1] ?? null;
}

function parseTableRows(markdown) {
  const rows = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith("|")) continue;
    if (/^\|[-\s:|]+\|$/.test(line)) continue;

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length < 5) continue;

    const route = decodeMarkdownLabel(cells[0]);
    const readmeHref = extractReadmeHref(cells[1]);
    if (!route || !readmeHref) continue;

    rows.push({
      route,
      readmeHref,
      type: cells[2],
      exception: cells[3] === "oui",
      summary: cells[4],
    });
  }
  return rows;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function freezeAnimations(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
      }
    `,
  });
}

async function stabilizePage(page) {
  await freezeAnimations(page);
  await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll("*"));
    for (const node of nodes) {
      const element = node;
      const styles = window.getComputedStyle(element);
      if (styles.visibility === "hidden") element.style.visibility = "visible";
      if (styles.opacity === "0") element.style.opacity = "1";
      if (styles.transform && styles.transform !== "none") element.style.transform = "none";
      if (styles.filter && styles.filter !== "none") element.style.filter = "none";
    }
  });
}

async function convertToWebp(sourcePath, targetPath) {
  const image = sharp(sourcePath);
  const metadata = await image.metadata();
  const maxDimension = Math.max(metadata.width ?? 0, metadata.height ?? 0);
  const shouldResize = maxDimension > 3000;
  const pipeline = shouldResize
    ? image.resize({
        width: metadata.width && metadata.width > metadata.height ? 3000 : undefined,
        height: metadata.height && metadata.height >= metadata.width ? 3000 : undefined,
        fit: "inside",
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3,
      })
    : image;

  await pipeline.webp({ quality: 85 }).toFile(targetPath);
}

async function captureRoute(page, entry) {
  const readmeAbsPath = path.resolve(rootDir, entry.readmeHref);
  const routeDir = path.dirname(readmeAbsPath);
  const stagedRouteDir = path.join(stagingRoot, path.relative(rootDir, routeDir));
  const pngDir = path.join(stagedRouteDir, "png");
  const webpDir = path.join(stagedRouteDir, "webp");

  await ensureDir(pngDir);
  await ensureDir(webpDir);

  const targetRoute = extractActualRoute(entry.route).startsWith("/")
    ? extractActualRoute(entry.route)
    : `/${extractActualRoute(entry.route)}`;
  const targetUrl = new URL(targetRoute, baseUrl).toString();

  const shots = [
    { name: "desktop", viewport: desktopViewport },
    { name: "mobile", viewport: mobileViewport },
  ];

  for (const shot of shots) {
    await page.setViewportSize(shot.viewport);
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(1200);
    await stabilizePage(page);

    const pngPath = path.join(pngDir, `${shot.name}.png`);
    await page.screenshot({
      path: pngPath,
      fullPage: true,
      animations: "disabled",
      caret: "hide",
    });

    const webpPath = path.join(webpDir, `${shot.name}-context.webp`);
    await convertToWebp(pngPath, webpPath);
  }
}

async function copyStagedCaptureTree() {
  const stagedRoutesDir = path.join(stagingRoot, "routes");
  const destinationRoutesDir = path.join(rootDir, "routes");
  await ensureDir(destinationRoutesDir);
  await fs.cp(stagedRoutesDir, destinationRoutesDir, { recursive: true, force: true });
}

async function main() {
  const indexMarkdown = await fs.readFile(indexPath, "utf8");
  const routes = parseTableRows(indexMarkdown);

  if (!routes.length) {
    throw new Error(`Aucune route détectée dans ${indexPath}`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: baseUrl,
    locale: "fr-FR",
    colorScheme: "light",
    viewport: desktopViewport,
  });

  const page = await context.newPage();

  try {
    for (const entry of routes) {
      console.log(`[capture] ${entry.route} -> ${entry.readmeHref}`);
      try {
        await captureRoute(page, entry);
      } catch (error) {
        console.error(`[capture][skip] ${entry.route}: ${error.message}`);
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  await copyStagedCaptureTree();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import test from "node:test";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildComponentHighlights,
  buildData,
  buildDynamicHtml,
  extractCssVars,
  formatItemMeta,
  generate,
  gradientBetween,
  hexToRgb,
  listComponentFiles,
  mixHex,
  parseLiteral,
  parseNavigationProfileSpaceMap,
  renderScript,
  watchAndRegenerate,
} from "./generate-design-system-board.mjs";

async function withTempDir(run) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "cleanmymap-board-test-"));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("parses the supported data literals without executing source code", () => {
  assert.deepEqual(
    parseLiteral(
      `const value = { safe: "ok", enabled: true, nested: [1, null, "x"] };`,
      "const value",
      "{",
    ),
    { safe: "ok", enabled: true, nested: [1, null, "x"] },
  );

  assert.deepEqual(
    parseLiteral(
      `const value = { route: ROUTE, label: "safe" };`,
      "const value",
      "{",
      { ROUTE: "/safe" },
    ),
    { route: "/safe", label: "safe" },
  );
});

test("rejects executable and computed literal syntax", () => {
  assert.throws(
    () => parseLiteral(`const value = { unsafe: (() => "executed")() };`, "const value", "{"),
    /Unsupported design-system literal syntax/,
  );
  assert.throws(
    () => parseLiteral(`const value = { ["unsafe"]: "value" };`, "const value", "{"),
    /Computed property names are not allowed/,
  );
});

test("parses the current navigation source without executing its helper", () => {
  const source = fs.readFileSync("apps/web/src/lib/navigation.ts", "utf8");
  const map = parseNavigationProfileSpaceMap(source);

  assert.deepEqual(map.benevole.home, ["dashboard", "explorer"]);
  assert.deepEqual(map.admin.home, ["dashboard", "explorer", "pilotage", "admin"]);
  assert.deepEqual(map.benevole.act, ["rejoindre-une-action", "new", "signalement"]);
});

test("covers supported literal forms and rejects malformed or executable syntax", () => {
  assert.deepEqual(
    parseLiteral(
      `const value = ({ label: ` + "`templated`" + `, count: 3, enabled: false, empty: null, nested: [VALUE], short: SHARED });`,
      "const value",
      "{",
      { VALUE: ["x"], SHARED: "ok" },
    ),
    { label: "templated", count: 3, enabled: false, empty: null, nested: [["x"]], short: "ok" },
  );
  assert.deepEqual(parseLiteral("const value = ([1, 2, 3]);", "const value", "["), [1, 2, 3]);
  assert.throws(() => parseLiteral("const value = UNKNOWN;", "const value", "{"), /Opening delimiter/);
  assert.throws(() => parseLiteral("const value = { missing: 1;", "const value", "{"), /Unable to find matching/);
  assert.throws(() => parseLiteral("const value = { missing: UNKNOWN };", "const value", "{"), /Unsupported literal identifier/);
  assert.throws(() => parseLiteral("const value = { ...other: 1 };", "const value", "{"), /Spread assignments/);
  assert.throws(() => parseLiteral("const value = [...items];", "const value", "["), /Spread expressions/);
  assert.throws(() => parseLiteral("const value = { missing };", "const value", "{"), /Unsupported literal identifier/);
  assert.throws(() => parseLiteral("const value = { method() {} };", "const value", "{"), /Only data properties/);
  assert.throws(() => parseLiteral("const value = { [key]: 1 };", "const value", "{"), /Computed property names/);
  assert.throws(() => parseLiteral("const value = { value: makeValue() };", "const value", "{"), /Unsupported design-system literal syntax/);
  assert.throws(() => parseLiteral("const other = 1;", "const value", "{"), /Marker not found/);
});

test("rejects unsupported navigation profile map shapes", () => {
  const prefix = `const ACT_VISIBLE_ROUTE_IDS = ["route"]; const COMMON_PROFILE_SPACE_PAGES = { act: ACT_VISIBLE_ROUTE_IDS };`;
  assert.throws(
    () => parseNavigationProfileSpaceMap(`${prefix} const PARCOURS_SPACE_PAGE_MAP = { benevole: other("home") };`),
    /must use buildProfileSpacePages/,
  );
  assert.throws(
    () => parseNavigationProfileSpaceMap(`${prefix} const PARCOURS_SPACE_PAGE_MAP = { "benevole": buildProfileSpacePages(["home"]) };`),
    /contains unsupported syntax/,
  );
  assert.throws(
    () => parseNavigationProfileSpaceMap(`${prefix} const PARCOURS_SPACE_PAGE_MAP = ["home"];`),
    /Opening delimiter/,
  );
});

test("covers CSS extraction, color normalization, metadata and component listings", async () => {
  assert.deepEqual(
    extractCssVars(`:root { --primary: #abc; malformed; --empty : ; --secondary: rgb(1, 2, 3); }`, ":root"),
    { "--primary": "#abc", "--empty": "", "--secondary": "rgb(1, 2, 3)" },
  );
  assert.deepEqual(extractCssVars(`:root { --unterminated: value }`, ":root"), {});
  assert.throws(() => extractCssVars(".other {}", ":root"), /CSS selector not found/);
  assert.throws(() => extractCssVars(":root", ":root"), /Opening brace not found/);

  assert.deepEqual(hexToRgb("#abc"), { r: 170, g: 187, b: 204 });
  assert.deepEqual(hexToRgb("#11223344"), { r: 17, g: 34, b: 51 });
  assert.equal(hexToRgb("not-a-color"), null);
  assert.equal(mixHex("#000000", "#ffffff", 0.5), "#808080");
  assert.equal(mixHex("invalid", "#ffffff"), "invalid");
  assert.equal(gradientBetween("#111", "#222"), "linear-gradient(180deg, #111, #222)");
  assert.equal(formatItemMeta("", "Bloc"), "Bloc");
  assert.equal(formatItemMeta("Terrain", "Terrain"), "Terrain");
  assert.equal(formatItemMeta("Terrain", "Agir"), "Terrain / Agir");
  assert.deepEqual(
    buildComponentHighlights(["cmm-button.tsx", "other.tsx"], ["app-navigation-ribbon.tsx", "unknown.tsx"]),
    ["app-navigation-ribbon", "cmm-button"],
  );

  await withTempDir(async (directory) => {
    const ui = path.join(directory, "ui");
    await mkdir(ui);
    await writeFile(path.join(ui, "b.tsx"), "export {};");
    await writeFile(path.join(ui, "a.tsx"), "export {};");
    await writeFile(path.join(ui, "ignored.test.tsx"), "export {};");
    await writeFile(path.join(ui, "README.md"), "ignored");
    assert.deepEqual(await listComponentFiles(ui), ["a.tsx", "b.tsx"]);
  });
});

function fixtureSources(directory) {
  return {
    globalsCss: path.join(directory, "globals.css"),
    blockAccents: path.join(directory, "block-accents.ts"),
    navigation: path.join(directory, "navigation.ts"),
    accueilPilotageRoutes: path.join(directory, "routes.ts"),
    sectionsConfig: path.join(directory, "sections.ts"),
    uiComponentsDir: path.join(directory, "ui"),
    navigationComponentsDir: path.join(directory, "navigation"),
  };
}

async function writeBoardFixtures(directory) {
  const sourceFiles = fixtureSources(directory);
  await mkdir(sourceFiles.uiComponentsDir, { recursive: true });
  await mkdir(sourceFiles.navigationComponentsDir, { recursive: true });
  await writeFile(path.join(sourceFiles.uiComponentsDir, "cmm-button.tsx"), "export {};");
  await writeFile(path.join(sourceFiles.uiComponentsDir, "local.tsx"), "export {};");
  await writeFile(path.join(sourceFiles.navigationComponentsDir, "app-navigation-ribbon.tsx"), "export {};");
  await writeFile(sourceFiles.globalsCss, `
    :root {
      --background: #ffffff; --bg-muted: #eeeeee; --foreground: #111111;
      --accent-primary: #abc; --accent-vibrant: #123456; --bg-elevated: #fafafa;
      --border-default: #dddddd; --border-strong: #999999; --focus-ring: #00aa88;
      --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px; --radius-full: 999px;
      --font-base: system-ui; --text-h1: 2rem; --text-body: 1rem;
    }
    html[data-theme="dark"] { --foreground: #eeeeee; }
    @theme inline {
      --glass-bg: rgba(255,255,255,.5); --glass-border: rgba(0,0,0,.1);
      --shadow-premium: 0 1px 2px #000; --shadow-vibrant: 0 2px 3px #000;
      --shadow-soft: 0 1px 1px #000; --shadow-elevated: 0 3px 4px #000;
      --glass-blur: blur(4px);
    }
  `);
  await writeFile(sourceFiles.blockAccents, `
    const BLOCK_ACCENT_MAP = { home: "amber", act: "emerald" };
    const ACCENT_TOKENS = {
      amber: { light: "#abc", dark: "#123456", gradientDeep: "from-[#111111] via-[#222222] to-[#333333]", surface: "amber-surface", surfaceMuted: "amber-muted", borderStrong: "amber-border" },
      emerald: { light: "#def", dark: "#456", gradientDeep: "", surface: "emerald-surface", surfaceMuted: "emerald-muted", borderStrong: "emerald-border" },
    };
  `);
  await writeFile(sourceFiles.navigation, `
    const SPACE_DEFINITIONS = { home: { label: { fr: "Accueil" }, icon: "H" }, act: { label: { fr: "Agir" }, icon: "A" } };
    const FIXED_SPACE_ORDER = ["home", "act"];
    const ACT_VISIBLE_ROUTE_IDS = ["route-a"];
    const COMMON_PROFILE_SPACE_PAGES = { act: ACT_VISIBLE_ROUTE_IDS, visualize: [], impact: [], network: [], connect: [], learn: [] };
    const PARCOURS_SPACE_PAGE_MAP = { benevole: buildProfileSpacePages(["route-a"]) };
  `);
  await writeFile(sourceFiles.accueilPilotageRoutes, `export const ROUTE_A = "/actions";`);
  await writeFile(sourceFiles.sectionsConfig, `
    export const RUBRIQUE_CATEGORIES = [{ id: "terrain", label: { fr: "Terrain" } }];
    export const RUBRIQUE_REGISTRY = [{ id: "route-a", categoryId: "terrain", label: { fr: "Action A" }, route: ROUTE_A }];
  `);
  return sourceFiles;
}

test("builds deterministic board data and injects the real dynamic script into a temporary template", async () => {
  await withTempDir(async (directory) => {
    const sourceFiles = await writeBoardFixtures(path.join(directory, "sources"));
    const boardDir = path.join(directory, "board");
    await mkdir(boardDir);
    const template = `<html><head><title>Static board</title></head><body>
      <div class="chip"><strong>Sources</strong> old</div>
      <div class="k">Tokens</div><div class="v">0</div>
      <div class="k">Blocs</div><div class="v">0</div>
      <div class="k">Effets</div><div class="v">0</div>
      <div class="k">UI</div><div class="v">0</div>
      <div class="d">La planche reste autonome, lisible à grande largeur et alignée avec les fichiers sources du dépôt.</div>
      <div id="palette-grid"></div><div id="block-grid"></div><div id="token-groups"></div><div id="effects-grid"></div>
      <script>oldScript();</script></body></html>`;
    await writeFile(path.join(boardDir, "design-system-board.html"), template);
    const result = await generate({ boardDir, sourceFiles, now: () => "2026-01-01T00:00:00.000Z" });
    const data = JSON.parse(await readFile(result.dataJsonPath, "utf8"));
    const html = await readFile(result.dynamicBoardHtmlPath, "utf8");
    assert.equal(data.generatedAt, "2026-01-01T00:00:00.000Z");
    assert.equal(data.stats.tokens, 8);
    assert.equal(data.stats.blocks, 2);
    assert.equal(data.blocks[0].gradient, "linear-gradient(180deg, #111111, #222222 58%, #333333)");
    assert.equal(data.blocks[1].gradient, "linear-gradient(180deg, #def, #456)");
    assert.equal(data.blocks[0].items[0].meta, "Terrain / Accueil");
    assert.deepEqual(data.sources.coreHighlightFiles, ["app-navigation-ribbon", "cmm-button"]);
    assert.match(html, /Planche visuelle du design system \(dynamique\)/);
    assert.match(html, /Terrain \/ Accueil/);
    assert.match(html, /palette\.map/);
    assert.doesNotMatch(html, /oldScript/);
    assert.deepEqual(await readdir(directory), ["board", "sources"]);
  });
});

test("rejects invalid templates and filesystem inputs without inventing output success", async () => {
  await withTempDir(async (directory) => {
    const sourceFiles = await writeBoardFixtures(path.join(directory, "sources"));
    const invalidTemplate = `<html><body><div id="palette-grid"></div></body></html>`;
    assert.throws(() => buildDynamicHtml(invalidTemplate, { sources: { list: [] }, stats: { tokens: 0, blocks: 0, effects: 0, ui: 0 } }), /Unable to find terminal script block/);
    await mkdir(path.join(directory, "board"));
    await writeFile(path.join(directory, "board", "design-system-board.html"), invalidTemplate);
    await assert.rejects(() => generate({ boardDir: path.join(directory, "board"), sourceFiles }), /Unable to find terminal script block/);
    await assert.rejects(() => buildData({ sourceFiles: { ...sourceFiles, globalsCss: path.join(directory, "missing.css") } }), /ENOENT/);
    const blockedPath = path.join(directory, "not-a-directory");
    await writeFile(blockedPath, "blocked");
    await assert.rejects(() => generate({ boardDir: blockedPath, sourceFiles }), /EEXIST|ENOTDIR/);
  });
});

test("renders structured script output and closes debounced watchers deterministically", async () => {
  const script = renderScript({ palette: [{ name: "A", token: "--a", tone: "#fff", value: "#fff", use: "test" }], blocks: [], tokenGroups: [], effects: [] });
  assert.match(script, /palette-grid/);
  assert.match(script, /A/);
  assert.match(script, /effects-grid/);

  const callbacks = [];
  const closed = [];
  let generated = 0;
  const warnings = [];
  const errors = [];
  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = (...args) => warnings.push(args.join(" "));
  console.error = (...args) => errors.push(args.join(" "));
  try {
    const close = await watchAndRegenerate({
      watchedPaths: ["ok", "broken"],
      generateImpl: async () => {
        generated += 1;
        if (generated === 2) throw new Error("regeneration failed");
      },
      watchImpl: (watchedPath, _options, callback) => {
        if (watchedPath === "broken") throw new Error("watch failed");
        callbacks.push(callback);
        return { close: () => closed.push(watchedPath) };
      },
    });
    assert.equal(generated, 1);
    assert.equal(warnings.length, 1);
    callbacks[0]();
    callbacks[0]();
    await new Promise((resolve) => setTimeout(resolve, 190));
    assert.equal(generated, 2);
    assert.equal(errors.length, 1);
    close();
    callbacks[0]();
    await new Promise((resolve) => setTimeout(resolve, 190));
    assert.equal(generated, 2);
    assert.deepEqual(closed, ["ok"]);
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
  }
});

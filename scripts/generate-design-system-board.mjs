#!/usr/bin/env node

import fs from "node:fs/promises";
import { watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");
const DOCS_DIR = path.join(ROOT_DIR, "documentation");

const STATIC_BOARD_HTML = path.join(DOCS_DIR, "design-system-board.html");
const DYNAMIC_BOARD_HTML = path.join(DOCS_DIR, "design-system-board.dynamic.html");
const BOARD_DATA_JSON = path.join(DOCS_DIR, "design-system-board.data.json");

const SOURCE_FILES = {
  globalsCss: path.join(ROOT_DIR, "apps/web/src/app/globals.css"),
  blockAccents: path.join(ROOT_DIR, "apps/web/src/lib/ui/block-accents.ts"),
  navigation: path.join(ROOT_DIR, "apps/web/src/lib/navigation.ts"),
  sectionsConfig: path.join(ROOT_DIR, "apps/web/src/lib/sections-registry/config.ts"),
  uiComponentsDir: path.join(ROOT_DIR, "apps/web/src/components/ui"),
  navigationComponentsDir: path.join(ROOT_DIR, "apps/web/src/components/navigation"),
};

const HIGHLIGHT_COMPONENTS = new Set([
  "cmm-button.tsx",
  "cmm-card.tsx",
  "cmm-pill.tsx",
  "cmm-section.tsx",
  "cmm-block-accent.tsx",
  "app-navigation-ribbon.tsx",
  "app-navigation-block-dropdown.tsx",
  "app-navigation-tree-menu.tsx",
  "global-search.tsx",
  "notification-bell.tsx",
  "site-preferences-controls.tsx",
  "vibrant-background.tsx",
  "page-transition.tsx",
  "cookie-consent-banner.tsx",
  "network-toast.tsx",
  "identity-badge.tsx",
  "identity-profile-banner.tsx",
  "display-mode-onboarding-gate.tsx",
  "conditional-analytics.tsx",
  "error-boundary.tsx",
  "error-message.tsx",
  "permission-error-state.tsx",
]);

const WATCH_ARGS = new Set(process.argv.slice(2));

function readText(filePath) {
  return fs.readFile(filePath, "utf8");
}

function writeText(filePath, content) {
  return fs.writeFile(filePath, content, "utf8");
}

function toJs(value) {
  return JSON.stringify(value, null, 2);
}

function findMatchingDelimiter(source, openIndex, openChar, closeChar) {
  let depth = 0;
  let inString = null;
  for (let i = openIndex; i < source.length; i += 1) {
    const char = source[i];
    if (inString) {
      if (char === "\\") {
        i += 1;
        continue;
      }
      if (char === inString) {
        inString = null;
      }
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      inString = char;
      continue;
    }
    if (char === openChar) {
      depth += 1;
    } else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  throw new Error(`Unable to find matching ${closeChar} for ${openChar} at ${openIndex}`);
}

function extractLiteral(source, marker, openChar) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`Marker not found: ${marker}`);
  }
  const equalsIndex = source.indexOf("=", markerIndex);
  const searchStart = equalsIndex === -1 ? markerIndex : equalsIndex;
  const openIndex = source.indexOf(openChar, searchStart);
  if (openIndex === -1) {
    throw new Error(`Opening delimiter ${openChar} not found after marker: ${marker}`);
  }
  const closeIndex = findMatchingDelimiter(source, openIndex, openChar, openChar === "{" ? "}" : "]");
  return source.slice(openIndex, closeIndex + 1);
}

function parseLiteral(source, marker, openChar) {
  const literal = extractLiteral(source, marker, openChar);
  // The extracted blocks are plain object/array literals with comments, so
  // evaluating them in a Function is sufficient and keeps the parser simple.
  return Function(`"use strict"; return (${literal});`)();
}

function extractCssVars(source, selector) {
  const selectorIndex = source.indexOf(selector);
  if (selectorIndex === -1) {
    throw new Error(`CSS selector not found: ${selector}`);
  }
  const openIndex = source.indexOf("{", selectorIndex);
  if (openIndex === -1) {
    throw new Error(`Opening brace not found after selector: ${selector}`);
  }
  const closeIndex = findMatchingDelimiter(source, openIndex, "{", "}");
  const block = source.slice(openIndex + 1, closeIndex);
  const vars = {};
  const matcher = /(--[A-Za-z0-9-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = matcher.exec(block))) {
    vars[match[1]] = match[2].trim();
  }
  return vars;
}

function stripExtension(fileName) {
  return fileName.replace(/\.[^.]+$/, "");
}

function hexToRgb(hex) {
  const normalized = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{3,8}$/.test(normalized)) {
    return null;
  }
  const full = normalized.length === 3
    ? normalized.split("").map((part) => part + part).join("")
    : normalized.slice(0, 6);
  const value = Number.parseInt(full, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

function mixHex(a, b, ratio = 0.5) {
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  if (!rgbA || !rgbB) {
    return a;
  }
  const blend = (start, end) => Math.round(start * (1 - ratio) + end * ratio);
  return rgbToHex(blend(rgbA.r, rgbB.r), blend(rgbA.g, rgbB.g), blend(rgbA.b, rgbB.b));
}

function gradientBetween(from, to) {
  return `linear-gradient(180deg, ${from}, ${to})`;
}

function listComponentFiles(dirPath) {
  return fs.readdir(dirPath, { withFileTypes: true }).then((entries) =>
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx"))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right, "fr"))
  );
}

function renderScript(data) {
  return `
    const palette = ${toJs(data.palette)};
    const blocks = ${toJs(data.blocks)};
    const tokenGroups = ${toJs(data.tokenGroups)};
    const effects = ${toJs(data.effects)};

    const paletteGrid = document.getElementById("palette-grid");
    const blockGrid = document.getElementById("block-grid");
    const tokenGroupsEl = document.getElementById("token-groups");
    const effectsGrid = document.getElementById("effects-grid");

    paletteGrid.innerHTML = palette.map((item) => \`
      <article class="palette-card">
        <div class="tone" style="background:\${item.tone};"></div>
        <div class="body">
          <div class="top">
            <div class="name">\${item.name}</div>
            <div class="token">\${item.token}</div>
          </div>
          <div class="value">\${item.value}</div>
          <div class="use">\${item.use}</div>
        </div>
      </article>
    \`).join("");

    blockGrid.innerHTML = blocks.map((block) => \`
      <article class="block-card">
        <div class="block-band" style="background:\${block.gradient};"></div>
        <div class="block-head">
          <div class="block-icon" style="background: linear-gradient(135deg, rgb(\${block.rgb} / 0.96), rgb(\${block.rgb} / 0.78));">\${block.icon}</div>
          <div class="block-name">\${block.name}</div>
          <div class="block-code">\${block.code}</div>
        </div>
        <div class="block-summary">\${block.summary}</div>
        <div class="block-specs">
          <div class="spec"><div class="k">gradientDeep</div><div class="v">\${block.gradientDeep}</div></div>
          <div class="spec"><div class="k">surface</div><div class="v">\${block.surface}</div></div>
          <div class="spec"><div class="k">surfaceMuted</div><div class="v">\${block.surfaceMuted}</div></div>
          <div class="spec"><div class="k">borderStrong</div><div class="v">\${block.borderStrong}</div></div>
        </div>
        <div class="block-items">
          \${block.items.map((item) => \`
            <article class="block-item" style="--accent-rgb:\${block.rgb};">
              <div class="bar"></div>
              <div class="label">\${item.label}</div>
              <div class="meta">\${item.meta}</div>
              <div class="route">\${item.route}</div>
              <div class="state"><span class="dot"></span>Accessible</div>
            </article>
          \`).join("")}
        </div>
      </article>
    \`).join("");

    tokenGroupsEl.innerHTML = tokenGroups.map((group) => \`
      <article class="group">
        <div class="name">\${group.name}</div>
        <div class="kv-list">
          \${group.items.map(([key, value]) => \`
            <div class="kv">
              <div class="k">\${key}</div>
              <div class="v">\${value}</div>
            </div>
          \`).join("")}
        </div>
      </article>
    \`).join("");

    effectsGrid.innerHTML = effects.map((effect) => \`
      <article class="effect">
        <div class="sample" data-code="\${effect.code}" style="\${effect.style}"></div>
        <h4>\${effect.title}</h4>
        <p>\${effect.text}</p>
      </article>
    \`).join("");
  `;
}

function buildComponentHighlights(uiFiles, navigationFiles) {
  const allFiles = [...uiFiles, ...navigationFiles];
  return allFiles
    .filter((file) => HIGHLIGHT_COMPONENTS.has(file))
    .map((file) => stripExtension(file))
    .sort((left, right) => left.localeCompare(right, "fr"));
}

function formatItemMeta(sourceCategory, exposedBlock) {
  if (!sourceCategory) {
    return exposedBlock;
  }
  if (!exposedBlock || sourceCategory === exposedBlock) {
    return sourceCategory;
  }
  return `${sourceCategory} / ${exposedBlock}`;
}

function buildSourceSummary() {
  return [
    "globals.css",
    "block-accents.ts",
    "navigation.ts",
    "sections-registry/config.ts",
    "components/ui",
    "components/navigation",
  ];
}

async function buildData() {
  const [
    globalsCss,
    blockAccentsSource,
    navigationSource,
    sectionsConfigSource,
    uiFiles,
    navigationFiles,
  ] = await Promise.all([
    readText(SOURCE_FILES.globalsCss),
    readText(SOURCE_FILES.blockAccents),
    readText(SOURCE_FILES.navigation),
    readText(SOURCE_FILES.sectionsConfig),
    listComponentFiles(SOURCE_FILES.uiComponentsDir),
    listComponentFiles(SOURCE_FILES.navigationComponentsDir),
  ]);

  const rootVars = extractCssVars(globalsCss, ":root");
  const darkVars = extractCssVars(globalsCss, 'html[data-theme="dark"]');
  const themeVars = extractCssVars(globalsCss, "@theme inline");

  const blockAccentMap = parseLiteral(blockAccentsSource, "export const BLOCK_ACCENT_MAP", "{");
  const accentTokens = parseLiteral(blockAccentsSource, "export const ACCENT_TOKENS", "{");
  const accentRgb = {
    amber: "245 158 11",
    emerald: "16 185 129",
    sky: "14 165 233",
    red: "244 63 94",
    yellow: "234 179 8",
    indigo: "99 102 241",
    pink: "236 72 153",
    slate: "100 116 139",
  };
  const spaceDefinitions = parseLiteral(navigationSource, "const SPACE_DEFINITIONS", "{");
  const fixedSpaceOrder = parseLiteral(navigationSource, "const FIXED_SPACE_ORDER", "[");
  const parcoursSpaceMap = parseLiteral(navigationSource, "const PARCOURS_SPACE_PAGE_MAP", "{");

  const rubriqueCategories = parseLiteral(sectionsConfigSource, "export const RUBRIQUE_CATEGORIES", "[");
  const rubriqueRegistry = parseLiteral(sectionsConfigSource, "export const RUBRIQUE_REGISTRY", "[");

  const rubriqueById = new Map(rubriqueRegistry.map((item) => [item.id, item]));
  const categoryById = new Map(rubriqueCategories.map((item) => [item.id, item]));
  const profileKey = "benevole";
  const profileSpaceMap = parcoursSpaceMap[profileKey] ?? {};
  const visibleSpaceIds = fixedSpaceOrder.filter((spaceId) => {
    const routes = profileSpaceMap[spaceId];
    return Array.isArray(routes) && routes.length > 0;
  });
  const hiddenSpaceIds = fixedSpaceOrder.filter((spaceId) => !visibleSpaceIds.includes(spaceId));

  const palette = [
    {
      name: "Background",
      token: "--background",
      value: rootVars["--background"],
      use: "Canvas général",
      tone: gradientBetween(rootVars["--background"], rootVars["--bg-muted"] ?? "#f5f5f4"),
    },
    {
      name: "Foreground",
      token: "--foreground",
      value: rootVars["--foreground"],
      use: "Texte principal",
      tone: gradientBetween(darkVars["--foreground"] ?? rootVars["--foreground"], rootVars["--foreground"]),
    },
    {
      name: "Accent primaire",
      token: "--accent-primary",
      value: rootVars["--accent-primary"],
      use: "Actions / succès",
      tone: gradientBetween(mixHex(rootVars["--accent-primary"], "#ffffff", 0.72), rootVars["--accent-primary"]),
    },
    {
      name: "Accent vibrant",
      token: "--accent-vibrant",
      value: rootVars["--accent-vibrant"],
      use: "Liens / focus",
      tone: gradientBetween(mixHex(rootVars["--accent-vibrant"], "#ffffff", 0.62), rootVars["--accent-vibrant"]),
    },
    {
      name: "Surface élevée",
      token: "--bg-elevated",
      value: rootVars["--bg-elevated"],
      use: "Cartes / panneaux",
      tone: gradientBetween(rootVars["--bg-elevated"], rootVars["--bg-muted"] ?? "#f5f5f4"),
    },
    {
      name: "Surface douce",
      token: "--bg-muted",
      value: rootVars["--bg-muted"],
      use: "Blocs secondaires",
      tone: gradientBetween(rootVars["--bg-muted"], mixHex(rootVars["--bg-muted"], "#ffffff", 0.22)),
    },
    {
      name: "Bordure par défaut",
      token: "--border-default",
      value: rootVars["--border-default"],
      use: "Contours subtils",
      tone: "linear-gradient(180deg, rgba(15,23,42,.10), rgba(15,23,42,.04))",
    },
    {
      name: "Focus ring",
      token: "--focus-ring",
      value: rootVars["--focus-ring"],
      use: "Focus clavier",
      tone: "linear-gradient(180deg, rgba(16,185,129,.34), rgba(56,189,248,.20))",
    },
  ];

  const blocks = visibleSpaceIds.map((spaceId) => {
    const space = spaceDefinitions[spaceId];
    const accent = blockAccentMap[spaceId];
    const tokens = accentTokens[accent];
    const routeIds = profileSpaceMap[spaceId] ?? [];
    const items = routeIds
      .map((routeId) => rubriqueById.get(routeId))
      .filter(Boolean)
      .map((rubrique) => ({
        label: rubrique.label.fr,
        route: rubrique.route,
        sourceCategory: categoryById.get(rubrique.categoryId)?.label?.fr ?? rubrique.categoryId,
        exposedBlock: space.label.fr,
        meta: formatItemMeta(
          categoryById.get(rubrique.categoryId)?.label?.fr ?? rubrique.categoryId,
          space.label.fr
        ),
      }));

    return {
      id: spaceId,
      name: space.label.fr,
      code: spaceId,
      icon: space.icon,
      rgb: accentRgb[accent] ?? "148 163 184",
      gradient: tokens.gradientDeep
        ? accentGradientFromTokens(tokens.gradientDeep)
        : accentGradientFromColor(tokens.light ?? "#f5f5f4", tokens.dark ?? "#cbd5e1"),
      gradientDeep: tokens.gradientDeep,
      surface: tokens.surface,
      surfaceMuted: tokens.surfaceMuted,
      borderStrong: tokens.borderStrong,
      summary: items.slice(0, 4).map((item) => item.label).join(", "),
      items,
    };
  });

  function accentGradientFromColor(light, dark) {
    return `linear-gradient(180deg, ${light}, ${dark})`;
  }

  function accentGradientFromTokens(tokenGradientDeep) {
    const gradientStops = {
      from: tokenGradientDeep.replace(/^from-/, "").split(" via-")[0],
      via: tokenGradientDeep.includes(" via-") ? tokenGradientDeep.split(" via-")[1].split(" to-")[0] : null,
      to: tokenGradientDeep.includes(" to-") ? tokenGradientDeep.split(" to-")[1] : null,
    };
    const from = gradientStops.from?.replace(/^\[|\]$/g, "") ?? "#f5f5f4";
    const via = gradientStops.via?.replace(/^\[|\]$/g, "") ?? from;
    const to = gradientStops.to?.replace(/^\[|\]$/g, "") ?? via;
    return `linear-gradient(180deg, ${from}, ${via} 58%, ${to})`;
  }

  const tokenGroups = [
    {
      name: "Palette de base",
      items: [
        ["--background", rootVars["--background"]],
        ["--foreground", rootVars["--foreground"]],
        ["--accent-primary", rootVars["--accent-primary"]],
        ["--accent-vibrant", rootVars["--accent-vibrant"]],
      ],
    },
    {
      name: "Surfaces",
      items: [
        ["--bg-canvas", rootVars["--background"]],
        ["--bg-elevated", rootVars["--bg-elevated"]],
        ["--bg-muted", rootVars["--bg-muted"]],
        ["--glass-bg", themeVars["--glass-bg"]],
      ],
    },
    {
      name: "Bords et focus",
      items: [
        ["--border-default", rootVars["--border-default"]],
        ["--border-strong", rootVars["--border-strong"]],
        ["--focus-ring", rootVars["--focus-ring"]],
        ["--glass-border", themeVars["--glass-border"]],
      ],
    },
    {
      name: "Ombres et profondeur",
      items: [
        ["--shadow-premium", themeVars["--shadow-premium"]],
        ["--shadow-vibrant", themeVars["--shadow-vibrant"]],
        ["--shadow-soft", themeVars["--shadow-soft"]],
        ["--shadow-elevated", themeVars["--shadow-elevated"]],
      ],
    },
    {
      name: "Rayons",
      items: [
        ["--radius-sm", rootVars["--radius-sm"]],
        ["--radius-md", rootVars["--radius-md"]],
        ["--radius-lg", rootVars["--radius-lg"]],
        ["--radius-full", rootVars["--radius-full"]],
      ],
    },
    {
      name: "Typographie",
      items: [
        ["--font-display", rootVars["--font-display"] ?? "system-ui"],
        ["--font-base", rootVars["--font-base"]],
        ["--text-h1", rootVars["--text-h1"]],
        ["--text-body", rootVars["--text-body"]],
      ],
    },
  ];

  const effects = [
    {
      title: "Blur",
      code: themeVars["--glass-blur"],
      text: "Flou léger pour détacher un calque d'information.",
      style: `background:
        linear-gradient(135deg, rgba(255,255,255,.78), rgba(15,23,42,.08)),
        repeating-linear-gradient(45deg, rgba(15,23,42,.12) 0 12px, rgba(255,255,255,.40) 12px 24px);
        backdrop-filter: blur(16px);`,
    },
    {
      title: "Backdrop blur",
      code: "backdrop-blur-xl",
      text: "Le fond reste lisible, la surface gagne en profondeur.",
      style: `background:
        radial-gradient(circle at 20% 20%, rgba(56,189,248,.26), transparent 32%),
        radial-gradient(circle at 78% 72%, rgba(16,185,129,.22), transparent 30%),
        linear-gradient(135deg, rgba(8, 15, 26, .88), rgba(15, 23, 42, .78));
        backdrop-filter: blur(20px);`,
    },
    {
      title: "Glow",
      code: "focal + ambient",
      text: "Deux couches: un cœur proche et un halo large.",
      style: `background:
        radial-gradient(circle at 30% 26%, rgba(16,185,129,.98), rgba(16,185,129,.28) 36%, transparent 58%),
        radial-gradient(circle at 72% 68%, rgba(56,189,248,.88), rgba(56,189,248,.24) 30%, transparent 58%),
        linear-gradient(135deg, rgba(4, 11, 24, .92), rgba(15, 23, 42, .88));
        box-shadow: ${themeVars["--shadow-vibrant"]};`,
    },
    {
      title: "Gradients",
      code: "180deg / 3 stops",
      text: "Dégradés directionnels de l'accent vers une teinte plus profonde.",
      style: `background: linear-gradient(135deg, ${rootVars["--accent-primary"]}, ${rootVars["--accent-vibrant"]});`,
    },
    {
      title: "Ombres",
      code: "soft + elevated",
      text: "Système doux, jamais massif ni trop contrasté.",
      style: `background:
        linear-gradient(180deg, rgba(255,255,255,.96), rgba(244,245,247,.92));
        box-shadow: ${themeVars["--shadow-soft"]}, 0 0 0 1px rgba(15,23,42,.06);`,
    },
    {
      title: "Glassmorphism",
      code: "surface premium",
      text: "Contours subtils, transparence contrôlée et blur contenu.",
      style: `background:
        linear-gradient(135deg, rgba(255,255,255,.82), rgba(255,255,255,.42)),
        radial-gradient(circle at 24% 18%, rgba(255,255,255,.72), transparent 24%);
        border: 1px solid ${themeVars["--glass-border"]};
        backdrop-filter: ${themeVars["--glass-blur"]};`,
    },
  ];

  const coreHighlightFiles = buildComponentHighlights(uiFiles, navigationFiles);

  return {
    generatedAt: new Date().toISOString(),
    stats: {
      tokens: palette.length,
      blocks: blocks.length,
      effects: effects.length,
      ui: coreHighlightFiles.length,
      visibleBlockIds: visibleSpaceIds,
      hiddenBlockIds: hiddenSpaceIds,
    },
    sources: {
      list: buildSourceSummary(),
      uiFiles,
      navigationFiles,
      coreHighlightFiles,
      profile: profileKey,
    },
    palette,
    blocks,
    tokenGroups,
    effects,
  };
}

function buildDynamicHtml(templateHtml, data) {
  const sourceList = data.sources.list.join(" / ");
  let html = templateHtml;

  html = html.replace(
    /<title>.*?<\/title>/s,
    "<title>CleanMyMap - Planche visuelle du design system (dynamique)</title>"
  );

  html = html.replace(
    /<div class="chip"><strong>Sources<\/strong>.*?<\/div>/s,
    `<div class="chip"><strong>Sources</strong> ${sourceList}</div>`
  );

  html = html.replace(
    /(<div class="k">Tokens<\/div>\s*<div class="v">)([^<]+)(<\/div>)/s,
    `$1${data.stats.tokens}$3`
  );
  html = html.replace(
    /(<div class="k">Blocs<\/div>\s*<div class="v">)([^<]+)(<\/div>)/s,
    `$1${data.stats.blocks}$3`
  );
  html = html.replace(
    /(<div class="k">Effets<\/div>\s*<div class="v">)([^<]+)(<\/div>)/s,
    `$1${data.stats.effects}$3`
  );
  html = html.replace(
    /(<div class="k">UI<\/div>\s*<div class="v">)([^<]+)(<\/div>)/s,
    `$1${data.stats.ui}$3`
  );

  html = html.replace(
    /<div class="d">\s*La planche reste autonome, lisible à grande largeur et alignée avec les fichiers sources du dépôt\.[\s\S]*?<\/div>/s,
    `<div class="d">
            La planche reste autonome, lisible à grande largeur et alignée avec les fichiers sources du dépôt.
            La copie dynamique est régénérée à partir des mêmes sources canoniques et reste exportable en PNG.
          </div>`
  );

  const scriptStart = html.lastIndexOf("<script>");
  const scriptEnd = html.lastIndexOf("</script>");
  if (scriptStart === -1 || scriptEnd === -1 || scriptEnd <= scriptStart) {
    throw new Error("Unable to find terminal script block in board template.");
  }

  const nextScript = `  <script>
${renderScript(data)}
  </script>`;

  return `${html.slice(0, scriptStart)}${nextScript}${html.slice(scriptEnd + "</script>".length)}`;
}

async function generate() {
  const data = await buildData();
  await fs.mkdir(DOCS_DIR, { recursive: true });
  await writeText(BOARD_DATA_JSON, `${JSON.stringify(data, null, 2)}\n`);

  const templateHtml = await readText(STATIC_BOARD_HTML);
  const dynamicHtml = buildDynamicHtml(templateHtml, data);
  await writeText(DYNAMIC_BOARD_HTML, dynamicHtml);

  console.log(`Generated ${path.relative(ROOT_DIR, DYNAMIC_BOARD_HTML)} and ${path.relative(ROOT_DIR, BOARD_DATA_JSON)}`);
}

async function watchAndRegenerate() {
  await generate();

  const watchedPaths = [
    SOURCE_FILES.globalsCss,
    SOURCE_FILES.blockAccents,
    SOURCE_FILES.navigation,
    SOURCE_FILES.sectionsConfig,
    SOURCE_FILES.uiComponentsDir,
    SOURCE_FILES.navigationComponentsDir,
  ];

  let timer = null;
  const schedule = () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      generate().catch((error) => {
        console.error(error);
      });
    }, 150);
  };

  for (const watchPath of watchedPaths) {
    try {
      watch(watchPath, { recursive: true }, schedule);
    } catch (error) {
      console.warn(`Unable to watch ${watchPath}:`, error.message);
    }
  }

  console.log("Watching design system sources for changes...");
}

const shouldWatch = WATCH_ARGS.has("--watch");

if (shouldWatch) {
  watchAndRegenerate().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
} else {
  generate().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

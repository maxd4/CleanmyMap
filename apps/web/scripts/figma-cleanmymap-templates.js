// CleanMyMap - Figma template generator
// Usage: run inside a Figma plugin environment (Code.ts equivalent).

async function loadFonts() {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });
}

function rgb(hex) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return { r, g, b };
}

function rgba(hex, opacity = 1) {
  const c = rgb(hex);
  return { r: c.r, g: c.g, b: c.b, a: opacity };
}

function solid(hex, opacity = 1) {
  return { type: "SOLID", color: rgb(hex), opacity };
}

function linearGradient(hexA, hexB, opacity = 1) {
  return {
    type: "GRADIENT_LINEAR",
    gradientStops: [
      { position: 0, color: rgba(hexA, opacity) },
      { position: 1, color: rgba(hexB, opacity) },
    ],
    gradientTransform: [
      [0.9, 0.45, 0],
      [-0.45, 0.9, 0],
    ],
  };
}

function ensurePaintStyle(name, paints) {
  const existing = figma.getLocalPaintStyles().find((s) => s.name === name);
  if (existing) {
    existing.paints = paints;
    return existing;
  }
  const style = figma.createPaintStyle();
  style.name = name;
  style.paints = paints;
  return style;
}

function ensureEffectStyle(name, effects) {
  const existing = figma.getLocalEffectStyles().find((s) => s.name === name);
  if (existing) {
    existing.effects = effects;
    return existing;
  }
  const style = figma.createEffectStyle();
  style.name = name;
  style.effects = effects;
  return style;
}

function ensureTextStyle(name, fontSize, lineHeight, weight) {
  const existing = figma.getLocalTextStyles().find((s) => s.name === name);
  const style = existing || figma.createTextStyle();
  style.name = name;
  style.fontName = { family: "Inter", style: weight };
  style.fontSize = fontSize;
  style.lineHeight = { unit: "PIXELS", value: lineHeight };
  return style;
}

function buildTokens() {
  const shared = {
    brandA: "#2FAF7A",
    brandB: "#62D8A4",
    accentA: "#2FBBCB",
    accentB: "#74D4FF",
    glow: "#6DE7C5",
    warn: "#EAB308",
  };

  const light = {
    pageBg: "#F6FAF8",
    surface: "#FFFFFF",
    surfaceSoft: "#EEF7F3",
    textStrong: "#0F2A23",
    textMuted: "#4A635A",
    border: "#D5E7DF",
    gradient: linearGradient("#E7FFF2", "#E7F6FF"),
    ctaText: "#082018",
    ctaSolid: "#75E5B3",
    ctaSolidHover: "#62D8A4",
  };

  const dark = {
    pageBg: "#0D1917",
    surface: "#122422",
    surfaceSoft: "#17302D",
    textStrong: "#E8FFF6",
    textMuted: "#9CC4B6",
    border: "#2B4A42",
    gradient: linearGradient("#15342C", "#113545"),
    ctaText: "#052016",
    ctaSolid: "#67DFA8",
    ctaSolidHover: "#58CC99",
  };

  return { shared, light, dark };
}

function createStyles(tokens) {
  const glowEffect = ensureEffectStyle("CMM/Shared/Glow/Soft", [
    {
      type: "DROP_SHADOW",
      color: rgba(tokens.shared.glow, 0.25),
      offset: { x: 0, y: 6 },
      radius: 18,
      spread: 0,
      visible: true,
      blendMode: "NORMAL",
    },
  ]);

  const text = {
    h1: ensureTextStyle("CMM/Shared/Text/H1", 32, 40, "Bold"),
    h2: ensureTextStyle("CMM/Shared/Text/H2", 22, 30, "Semi Bold"),
    body: ensureTextStyle("CMM/Shared/Text/Body", 14, 22, "Regular"),
    label: ensureTextStyle("CMM/Shared/Text/Label", 12, 16, "Medium"),
    button: ensureTextStyle("CMM/Shared/Text/Button", 14, 20, "Semi Bold"),
  };

  const light = {
    pageBg: ensurePaintStyle("CMM/Light/BG/Page", [solid(tokens.light.pageBg)]),
    surface: ensurePaintStyle("CMM/Light/Surface/Default", [solid(tokens.light.surface)]),
    surfaceSoft: ensurePaintStyle("CMM/Light/Surface/Soft", [solid(tokens.light.surfaceSoft)]),
    textStrong: ensurePaintStyle("CMM/Light/Text/Strong", [solid(tokens.light.textStrong)]),
    textMuted: ensurePaintStyle("CMM/Light/Text/Muted", [solid(tokens.light.textMuted)]),
    border: ensurePaintStyle("CMM/Light/Border/Default", [solid(tokens.light.border)]),
    headerGradient: ensurePaintStyle("CMM/Light/Gradient/Header", [tokens.light.gradient]),
    ctaSolid: ensurePaintStyle("CMM/Light/CTA/Solid", [solid(tokens.light.ctaSolid)]),
  };

  const dark = {
    pageBg: ensurePaintStyle("CMM/Dark/BG/Page", [solid(tokens.dark.pageBg)]),
    surface: ensurePaintStyle("CMM/Dark/Surface/Default", [solid(tokens.dark.surface)]),
    surfaceSoft: ensurePaintStyle("CMM/Dark/Surface/Soft", [solid(tokens.dark.surfaceSoft)]),
    textStrong: ensurePaintStyle("CMM/Dark/Text/Strong", [solid(tokens.dark.textStrong)]),
    textMuted: ensurePaintStyle("CMM/Dark/Text/Muted", [solid(tokens.dark.textMuted)]),
    border: ensurePaintStyle("CMM/Dark/Border/Default", [solid(tokens.dark.border)]),
    headerGradient: ensurePaintStyle("CMM/Dark/Gradient/Header", [tokens.dark.gradient]),
    ctaSolid: ensurePaintStyle("CMM/Dark/CTA/Solid", [solid(tokens.dark.ctaSolid)]),
  };

  return { glowEffect, text, light, dark };
}

function createText(content, style, paintStyleId) {
  const node = figma.createText();
  node.characters = content;
  node.textStyleId = style.id;
  if (paintStyleId) node.fillStyleId = paintStyleId;
  return node;
}

function setupAutoLayout(frame, direction = "VERTICAL", gap = 0, padding = 0) {
  frame.layoutMode = direction;
  frame.itemSpacing = gap;
  frame.paddingTop = padding;
  frame.paddingBottom = padding;
  frame.paddingLeft = padding;
  frame.paddingRight = padding;
  frame.counterAxisSizingMode = "AUTO";
  frame.primaryAxisSizingMode = "AUTO";
}

function buildHeaderComponent(styles, themeName) {
  const isDark = themeName === "dark";
  const theme = isDark ? styles.dark : styles.light;

  const header = figma.createComponent();
  header.name = `CMM/${themeName === "dark" ? "Dark" : "Light"}/Header`;
  header.resize(1200, 88);
  header.fills = theme.headerGradient.paints;
  header.effects = styles.glowEffect.effects;
  header.strokes = theme.border.paints;
  header.strokeWeight = 1;
  setupAutoLayout(header, "HORIZONTAL", 16, 20);
  header.counterAxisAlignItems = "CENTER";
  header.primaryAxisAlignItems = "SPACE_BETWEEN";
  header.primaryAxisSizingMode = "FIXED";
  header.counterAxisSizingMode = "FIXED";

  const brandWrap = figma.createFrame();
  brandWrap.name = "Brand";
  brandWrap.fills = [];
  setupAutoLayout(brandWrap, "VERTICAL", 2, 0);

  const title = createText("CleanMyMap", styles.text.h2, theme.textStrong.id);
  const subtitle = createText("Engagement citoyen pour un territoire propre", styles.text.label, theme.textMuted.id);
  brandWrap.appendChild(title);
  brandWrap.appendChild(subtitle);

  const controls = figma.createFrame();
  controls.name = "Header Controls";
  controls.fills = [];
  setupAutoLayout(controls, "HORIZONTAL", 10, 0);
  controls.counterAxisAlignItems = "CENTER";

  const modePill = figma.createFrame();
  modePill.name = "Mode Toggle";
  modePill.cornerRadius = 999;
  modePill.fills = theme.surfaceSoft.paints;
  modePill.strokes = theme.border.paints;
  modePill.strokeWeight = 1;
  setupAutoLayout(modePill, "HORIZONTAL", 8, 10);
  modePill.counterAxisAlignItems = "CENTER";
  const modeDot = figma.createEllipse();
  modeDot.resize(10, 10);
  modeDot.fills = [solid("#6DE7C5")];
  modeDot.effects = styles.glowEffect.effects;
  const modeText = createText(isDark ? "Dark" : "Light", styles.text.button, theme.textStrong.id);
  modePill.appendChild(modeDot);
  modePill.appendChild(modeText);

  const langPill = figma.createFrame();
  langPill.name = "Language Toggle";
  langPill.cornerRadius = 999;
  langPill.fills = theme.surfaceSoft.paints;
  langPill.strokes = theme.border.paints;
  langPill.strokeWeight = 1;
  setupAutoLayout(langPill, "HORIZONTAL", 6, 10);
  langPill.counterAxisAlignItems = "CENTER";
  const langText = createText("FR | EN", styles.text.button, theme.textStrong.id);
  langPill.appendChild(langText);

  controls.appendChild(modePill);
  controls.appendChild(langPill);
  header.appendChild(brandWrap);
  header.appendChild(controls);
  return header;
}

function buildButtonComponent(styles, themeName) {
  const isDark = themeName === "dark";
  const theme = isDark ? styles.dark : styles.light;
  const button = figma.createComponent();
  button.name = `CMM/${isDark ? "Dark" : "Light"}/Button/Primary`;
  button.cornerRadius = 12;
  button.fills = theme.ctaSolid.paints;
  button.effects = styles.glowEffect.effects;
  setupAutoLayout(button, "HORIZONTAL", 8, 12);
  button.counterAxisAlignItems = "CENTER";

  const label = createText("Declencher une action", styles.text.button, ensurePaintStyle(`CMM/${isDark ? "Dark" : "Light"}/Button/Text`, [solid(isDark ? "#082218" : "#0B2B20")]).id);
  button.appendChild(label);
  return button;
}

function buildCardComponent(styles, themeName) {
  const isDark = themeName === "dark";
  const theme = isDark ? styles.dark : styles.light;
  const card = figma.createComponent();
  card.name = `CMM/${isDark ? "Dark" : "Light"}/Card/Default`;
  card.resize(360, 180);
  card.cornerRadius = 18;
  card.fills = theme.surface.paints;
  card.strokes = theme.border.paints;
  card.strokeWeight = 1;
  setupAutoLayout(card, "VERTICAL", 10, 16);
  card.primaryAxisSizingMode = "FIXED";
  card.counterAxisSizingMode = "FIXED";

  const title = createText("Zone prioritaire", styles.text.h2, theme.textStrong.id);
  title.fontSize = 18;
  title.lineHeight = { unit: "PIXELS", value: 24 };
  const body = createText(
    "Consolider les signalements, ajuster les tournées et synchroniser les partenaires locaux.",
    styles.text.body,
    theme.textMuted.id,
  );
  body.textAutoResize = "HEIGHT";
  body.resize(328, body.height);
  card.appendChild(title);
  card.appendChild(body);
  return card;
}

function buildInputComponent(styles, themeName) {
  const isDark = themeName === "dark";
  const theme = isDark ? styles.dark : styles.light;
  const input = figma.createComponent();
  input.name = `CMM/${isDark ? "Dark" : "Light"}/Input/Default`;
  input.resize(360, 88);
  input.fills = [];
  setupAutoLayout(input, "VERTICAL", 6, 0);
  input.primaryAxisSizingMode = "FIXED";
  input.counterAxisSizingMode = "FIXED";

  const label = createText("Adresse / zone", styles.text.label, theme.textMuted.id);
  const field = figma.createFrame();
  field.name = "Field";
  field.resize(360, 48);
  field.cornerRadius = 12;
  field.fills = theme.surfaceSoft.paints;
  field.strokes = theme.border.paints;
  field.strokeWeight = 1;
  setupAutoLayout(field, "HORIZONTAL", 8, 14);
  field.primaryAxisSizingMode = "FIXED";
  field.counterAxisSizingMode = "FIXED";
  field.counterAxisAlignItems = "CENTER";

  const placeholder = createText("Saisir un lieu...", styles.text.body, theme.textMuted.id);
  field.appendChild(placeholder);
  input.appendChild(label);
  input.appendChild(field);
  return input;
}

function buildContentBlockComponent(styles, themeName) {
  const isDark = themeName === "dark";
  const theme = isDark ? styles.dark : styles.light;
  const block = figma.createComponent();
  block.name = `CMM/${isDark ? "Dark" : "Light"}/Content/PrimaryZone`;
  block.resize(1200, 300);
  block.cornerRadius = 24;
  block.fills = theme.surface.paints;
  block.strokes = theme.border.paints;
  block.strokeWeight = 1;
  setupAutoLayout(block, "VERTICAL", 12, 20);
  block.primaryAxisSizingMode = "FIXED";
  block.counterAxisSizingMode = "FIXED";

  const h = createText("Zone de contenu principale", styles.text.h2, theme.textStrong.id);
  const p = createText("Blocs analytics, cartes d'impact, livrables et actions prioritaires.", styles.text.body, theme.textMuted.id);
  block.appendChild(h);
  block.appendChild(p);
  return block;
}

function buildTemplateFrame(styles, themeName, components, x) {
  const isDark = themeName === "dark";
  const theme = isDark ? styles.dark : styles.light;
  const frame = figma.createFrame();
  frame.name = `Template ${isDark ? "Dark" : "Light"} - CleanMyMap`;
  frame.resize(1440, 1800);
  frame.x = x;
  frame.y = 0;
  frame.fills = theme.pageBg.paints;
  setupAutoLayout(frame, "VERTICAL", 18, 28);
  frame.primaryAxisSizingMode = "FIXED";
  frame.counterAxisSizingMode = "FIXED";

  const header = components.header.createInstance();
  const content = components.content.createInstance();

  const row = figma.createFrame();
  row.name = "UI blocks";
  row.fills = [];
  setupAutoLayout(row, "HORIZONTAL", 16, 0);
  row.primaryAxisSizingMode = "AUTO";
  row.counterAxisSizingMode = "AUTO";
  row.counterAxisAlignItems = "MIN";

  const cardA = components.card.createInstance();
  const cardB = components.card.createInstance();
  const formCol = figma.createFrame();
  formCol.name = "Form blocks";
  formCol.fills = [];
  setupAutoLayout(formCol, "VERTICAL", 12, 0);
  formCol.appendChild(components.input.createInstance());
  formCol.appendChild(components.input.createInstance());
  formCol.appendChild(components.button.createInstance());

  row.appendChild(cardA);
  row.appendChild(cardB);
  row.appendChild(formCol);

  frame.appendChild(header);
  frame.appendChild(content);
  frame.appendChild(row);
  return frame;
}

async function main() {
  await loadFonts();

  const tokens = buildTokens();
  const styles = createStyles(tokens);

  const container =
    typeof figma.createSection === "function" ? figma.createSection() : figma.createFrame();
  container.name = "CleanMyMap - Reusable Templates (Light + Dark)";
  if ("resizeWithoutConstraints" in container && typeof container.resizeWithoutConstraints === "function") {
    container.resizeWithoutConstraints(3200, 2100);
  } else {
    container.resize(3200, 2100);
    if ("fills" in container) {
      container.fills = [];
    }
  }

  const lightComponents = {
    header: buildHeaderComponent(styles, "light"),
    button: buildButtonComponent(styles, "light"),
    card: buildCardComponent(styles, "light"),
    input: buildInputComponent(styles, "light"),
    content: buildContentBlockComponent(styles, "light"),
  };
  const darkComponents = {
    header: buildHeaderComponent(styles, "dark"),
    button: buildButtonComponent(styles, "dark"),
    card: buildCardComponent(styles, "dark"),
    input: buildInputComponent(styles, "dark"),
    content: buildContentBlockComponent(styles, "dark"),
  };

  const componentShelf = figma.createFrame();
  componentShelf.name = "Reusable Components";
  componentShelf.x = 40;
  componentShelf.y = 40;
  componentShelf.fills = [];
  setupAutoLayout(componentShelf, "HORIZONTAL", 20, 0);

  const lightGroup = figma.createFrame();
  lightGroup.name = "Light Components";
  lightGroup.fills = [];
  setupAutoLayout(lightGroup, "VERTICAL", 10, 0);
  lightGroup.appendChild(lightComponents.header);
  lightGroup.appendChild(lightComponents.button);
  lightGroup.appendChild(lightComponents.input);
  lightGroup.appendChild(lightComponents.card);
  lightGroup.appendChild(lightComponents.content);

  const darkGroup = figma.createFrame();
  darkGroup.name = "Dark Components";
  darkGroup.fills = [];
  setupAutoLayout(darkGroup, "VERTICAL", 10, 0);
  darkGroup.appendChild(darkComponents.header);
  darkGroup.appendChild(darkComponents.button);
  darkGroup.appendChild(darkComponents.input);
  darkGroup.appendChild(darkComponents.card);
  darkGroup.appendChild(darkComponents.content);

  componentShelf.appendChild(lightGroup);
  componentShelf.appendChild(darkGroup);

  const lightTemplate = buildTemplateFrame(styles, "light", lightComponents, 40);
  lightTemplate.y = 920;
  const darkTemplate = buildTemplateFrame(styles, "dark", darkComponents, 1520);
  darkTemplate.y = 920;

  container.appendChild(componentShelf);
  container.appendChild(lightTemplate);
  container.appendChild(darkTemplate);

  figma.currentPage.appendChild(container);
  figma.viewport.scrollAndZoomIntoView([container]);
  figma.closePlugin("CleanMyMap templates generated: light + dark with reusable styles/components.");
}

main().catch((error) => {
  figma.closePlugin(`Template generation failed: ${error instanceof Error ? error.message : String(error)}`);
});

import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const MAX_CONTEXT_SIZE = 3000; // Taille max pour VS Code/Codex

const viewports = [
  { name: "desktop", width: 1440, height: 1200 },
  { name: "mobile", width: 390, height: 844 },
];

// Configuration des captures organisées par section
const captureConfig = [
  // Pages complètes
  {
    route: "/",
    type: "page",
    section: "accueil",
    outputDir: "documentation/liberte-UX-UI/01-ACCUEIL",
    filename: "accueil",
    generateContext: true // Génère aussi une version contexte
  },
  {
    route: "/accueil",
    type: "page", 
    section: "accueil",
    outputDir: "documentation/liberte-UX-UI/01-ACCUEIL",
    filename: "accueil",
    generateContext: true
  },
  {
    route: "/agir",
    type: "page",
    section: "agir", 
    outputDir: "documentation/liberte-UX-UI/03-BLOC-AGIR",
    filename: "agir-page",
    generateContext: true
  },
  {
    route: "/visualiser",
    type: "page",
    section: "visualiser",
    outputDir: "documentation/liberte-UX-UI/04-BLOC-VISUALISER",
    filename: "visualiser-page",
    generateContext: true
  },
  {
    route: "/profil-impact",
    type: "page",
    section: "profil-impact",
    outputDir: "documentation/liberte-UX-UI/05-BLOC-IMPACT",
    filename: "profil-impact-page",
    generateContext: true
  },
  {
    route: "/reseau",
    type: "page",
    section: "reseau",
    outputDir: "documentation/liberte-UX-UI/06-BLOC-RESEAU",
    filename: "reseau-page"
  },
  {
    route: "/observatoire-public",
    type: "page",
    section: "observatoire",
    outputDir: "documentation/liberte-UX-UI/04-BLOC-VISUALISER",
    filename: "observatoire-public"
  },
  {
    route: "/annuaire-partenaires",
    type: "page",
    section: "annuaire",
    outputDir: "documentation/liberte-UX-UI/06-BLOC-RESEAU",
    filename: "annuaire-partenaires"
  },
  {
    route: "/operations-collectives",
    type: "page",
    section: "operations",
    outputDir: "documentation/liberte-UX-UI/06-BLOC-RESEAU",
    filename: "operations-collectives"
  },
  {
    route: "/messagerie-pro",
    type: "page",
    section: "messagerie",
    outputDir: "documentation/liberte-UX-UI/07-BLOC-ECHANGES",
    filename: "messagerie-pro"
  },
  {
    route: "/reglages",
    type: "page",
    section: "reglages",
    outputDir: "documentation/liberte-UX-UI/10-PAGES-STANDALONE/roles/profil",
    filename: "reglages"
  },
  
  // Blocs spécifiques de l'accueil (nécessitent des sélecteurs CSS)
  {
    route: "/",
    type: "block",
    section: "hero",
    selector: "[data-section='hero'], .hero-section, header.hero",
    outputDir: "documentation/liberte-UX-UI/01-ACCUEIL",
    filename: "hero"
  },
  {
    route: "/",
    type: "block",
    section: "benefits",
    selector: "[data-section='benefits'], .benefits-section",
    outputDir: "documentation/liberte-UX-UI/01-ACCUEIL",
    filename: "benefits"
  },
  {
    route: "/",
    type: "block",
    section: "pillars",
    selector: "[data-section='pillars'], .pillars-section",
    outputDir: "documentation/liberte-UX-UI/01-ACCUEIL",
    filename: "pillars"
  },
  {
    route: "/",
    type: "block",
    section: "impact-summary",
    selector: "[data-section='impact-summary'], .impact-summary-section",
    outputDir: "documentation/liberte-UX-UI/01-ACCUEIL",
    filename: "impact-summary"
  },
  {
    route: "/",
    type: "block",
    section: "community-activity",
    selector: "[data-section='community-activity'], .community-activity-section",
    outputDir: "documentation/liberte-UX-UI/01-ACCUEIL",
    filename: "community-activity"
  },
  {
    route: "/",
    type: "block",
    section: "credibility-footer",
    selector: "[data-section='credibility-footer'], .credibility-footer-section, footer",
    outputDir: "documentation/liberte-UX-UI/01-ACCUEIL",
    filename: "credibility-footer"
  }
];

async function mirrorCaptureOutputs(sourcePath, config) {
  if (!config.mirrorDirs?.length) {
    return [];
  }

  const mirroredPaths = [];
  for (const mirrorDir of config.mirrorDirs) {
    const relativeFormatDir = path.basename(path.dirname(sourcePath));
    const resolvedMirrorDir = path.resolve(mirrorDir, relativeFormatDir);
    await fs.mkdir(resolvedMirrorDir, { recursive: true });
    const destinationPath = path.join(resolvedMirrorDir, path.basename(sourcePath));
    await fs.copyFile(sourcePath, destinationPath);
    mirroredPaths.push(destinationPath);
  }

  return mirroredPaths;
}

async function autoScroll(page) {
  const scrollStep = 320;
  const scrollDelayMs = 180;
  const settleAfterScrollMs = 900;
  const settleAfterTopMs = 500;
  let previousHeight = -1;
  let stablePasses = 0;

  while (stablePasses < 2) {
    const { scrollHeight, innerHeight, scrollY } = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      scrollY: window.scrollY,
    }));

    const maxScrollTop = Math.max(0, scrollHeight - innerHeight);
    if (scrollY >= maxScrollTop) {
      if (scrollHeight === previousHeight) {
        stablePasses += 1;
      } else {
        stablePasses = 0;
        previousHeight = scrollHeight;
      }
      await page.waitForTimeout(scrollDelayMs);
      continue;
    }

    const nextScrollTop = Math.min(scrollY + scrollStep, maxScrollTop);
    await page.evaluate((value) => {
      window.scrollTo({ top: value, behavior: "auto" });
    }, nextScrollTop);
    await page.waitForTimeout(scrollDelayMs);
  }

  await page.waitForTimeout(settleAfterScrollMs);
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  });
  await page.waitForTimeout(settleAfterTopMs);
}

async function forceFinalVisibleState(page) {
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

  await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll("*"));

    for (const node of nodes) {
      const element = node;
      const styles = window.getComputedStyle(element);

      if (styles.visibility === "hidden") {
        element.style.visibility = "visible";
      }

      if (styles.opacity === "0") {
        element.style.opacity = "1";
      }

      if (styles.transform && styles.transform !== "none") {
        element.style.transform = "none";
      }

      if (styles.filter && styles.filter !== "none") {
        element.style.filter = "none";
      }
    }
  });

  await page.waitForTimeout(300);
}

async function generateContextVersion(originalPath, contextPath, config, viewport) {
  if (!config.generateContext) return null;
  
  try {
    const image = sharp(originalPath);
    const metadata = await image.metadata();
    
    // Calculer les nouvelles dimensions en gardant le ratio
    let { width, height } = metadata;
    const maxDimension = Math.max(width, height);
    
    if (maxDimension <= MAX_CONTEXT_SIZE) {
      // L'image est déjà assez petite, on fait juste une copie optimisée
      await image
        .webp({ quality: 85 })
        .toFile(contextPath);
      return contextPath;
    }
    
    // Redimensionner proportionnellement
    const scale = MAX_CONTEXT_SIZE / maxDimension;
    const newWidth = Math.round(width * scale);
    const newHeight = Math.round(height * scale);
    
    await image
      .resize(newWidth, newHeight, {
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: true
      })
      .webp({ quality: 85 })
      .toFile(contextPath);
    
    console.log(`  📐 Context version: ${newWidth}x${newHeight} → ${path.basename(contextPath)}`);
    return contextPath;
    
  } catch (error) {
    console.error(`  ⚠️ Failed to generate context version: ${error.message}`);
    return null;
  }
}

async function captureElement(page, config, viewport) {
  const outputRootDir = path.resolve(config.outputDir);
  const pngDir = path.join(outputRootDir, "png");
  const webpDir = path.join(outputRootDir, "webp");

  await fs.mkdir(pngDir, { recursive: true });
  await fs.mkdir(webpDir, { recursive: true });

  const screenshotsDir = path.resolve("screenshots");
  await fs.mkdir(screenshotsDir, { recursive: true });
  
  const fileName = `${config.filename}.${viewport.name}.png`;
  const filePath = path.join(pngDir, fileName);

  const contextFileName = `${config.filename}-${viewport.name}-context.webp`;
  const contextPath = path.join(webpDir, contextFileName);
  
  const url = `${BASE_URL}${config.route}`;
  
  console.log(`Capturing ${config.type} "${config.section}" from ${url} (${viewport.name})`);
  
  try {
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    if (config.type === "page") {
      await autoScroll(page);
    }

    await forceFinalVisibleState(page);
    
    if (config.type === "block" && config.selector) {
      // Tentative de capture d'un bloc spécifique
      const element = await page.locator(config.selector).first();
      const isVisible = await element.isVisible().catch(() => false);
      
      if (isVisible) {
        await element.screenshot({
          path: filePath,
        });
        console.log(`  ✓ Saved block ${path.basename(filePath)}`);
      } else {
        console.warn(`  ⚠️ Block selector "${config.selector}" not found, falling back to full page`);
        await autoScroll(page);
        await page.screenshot({
          path: filePath,
          fullPage: true,
        });
        console.log(`  ✓ Saved fallback ${path.basename(filePath)}`);
      }
    } else {
      // Capture de page complète
      await page.screenshot({
        path: filePath,
        fullPage: true,
      });
      console.log(`  ✓ Saved page ${path.basename(filePath)}`);

      if (config.route === "/" && viewport.name === "desktop") {
        const accueilFullPath = path.join(screenshotsDir, "page-accueil-full.png");
        await fs.copyFile(filePath, accueilFullPath);
        console.log(`  ✓ Saved accueil alias ${path.basename(accueilFullPath)}`);
      }
    }
    
    const mirroredPaths = await mirrorCaptureOutputs(filePath, config);
    mirroredPaths.forEach((mirroredPath) => {
      console.log(`  ↳ Mirrored ${path.basename(mirroredPath)} to ${path.dirname(mirroredPath)}`);
    });

    // Générer la version contexte si demandée
    let contextFilePath = null;
    if (config.generateContext) {
      contextFilePath = await generateContextVersion(filePath, contextPath, config, viewport);
      if (contextFilePath) {
        const mirroredContextPaths = await mirrorCaptureOutputs(contextFilePath, config);
        mirroredContextPaths.forEach((mirroredPath) => {
          console.log(`  ↳ Mirrored ${path.basename(mirroredPath)} to ${path.dirname(mirroredPath)}`);
        });
      }
    }
    
    return { 
      success: true, 
      path: filePath, 
      contextPath: contextFilePath,
      mirroredPaths,
    };
  } catch (error) {
    console.error(`  ✗ Failed to capture ${config.section} from ${url}:`);
    console.error(`    ${error.message}`);
    return { success: false, error: error.message, config };
  }
}

async function main() {
  const browser = await chromium.launch();
  const results = {
    successful: [],
    contextVersions: [],
    failed: [],
    missingSelectors: []
  };
  
  console.log(`🚀 Starting captures with base URL: ${BASE_URL}`);
  console.log(`📁 Output will be organized in documentation/liberte-UX-UI/`);
  console.log(`📐 Context versions (≤${MAX_CONTEXT_SIZE}px) will be saved in screenshots/`);
  console.log("");
  
  for (const viewport of viewports) {
    console.log(`📱 Processing ${viewport.name} viewport (${viewport.width}x${viewport.height})`);
    
    const page = await browser.newPage({
      viewport: {
        width: viewport.width,
        height: viewport.height,
      },
      deviceScaleFactor: 1,
    });
    
    for (const config of captureConfig) {
      const result = await captureElement(page, config, viewport);
      
      if (result.success) {
        results.successful.push(result.path);
        if (result.contextPath) {
          results.contextVersions.push(result.contextPath);
        }
      } else {
        results.failed.push({ config, error: result.error });
        
        if (config.type === "block" && result.error.includes("selector")) {
          results.missingSelectors.push(config.selector);
        }
      }
    }
    
    await page.close();
    console.log("");
  }
  
  await browser.close();
  
  // Rapport final
  console.log("📊 CAPTURE REPORT");
  console.log("==================");
  console.log(`✅ Successful captures: ${results.successful.length}`);
  console.log(`📐 Context versions: ${results.contextVersions.length}`);
  console.log(`❌ Failed captures: ${results.failed.length}`);
  
  if (results.successful.length > 0) {
    console.log("\n📁 Original files created:");
    results.successful.forEach(file => {
      console.log(`  ${file}`);
    });
  }
  
  if (results.contextVersions.length > 0) {
    console.log("\n📐 Context versions (VS Code compatible):");
    results.contextVersions.forEach(file => {
      console.log(`  ${file}`);
    });
  }
  
  if (results.failed.length > 0) {
    console.log("\n⚠️ Failed captures:");
    results.failed.forEach(({ config, error }) => {
      console.log(`  ${config.section} (${config.route}): ${error}`);
    });
  }
  
  if (results.missingSelectors.length > 0) {
    console.log("\n🔍 Missing CSS selectors (blocks not captured):");
    [...new Set(results.missingSelectors)].forEach(selector => {
      console.log(`  ${selector}`);
    });
    console.log("\n💡 To capture these blocks, add the corresponding data-section attributes to your React components.");
  }
  
  console.log("\n🎯 Next steps:");
  console.log("  1. Review captured images in documentation/liberte-UX-UI/");
  console.log("  2. Use context versions from screenshots/ for VS Code/Codex");
  console.log("  3. Add missing data-section attributes for block captures");
  console.log("  4. Re-run: npm run screenshots");
}

main();


import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const navigationDirectory = path.dirname(fileURLToPath(import.meta.url));
const sourceDirectory = path.resolve(navigationDirectory, "../..");

describe("global ribbon capture contract", () => {
  it("keeps sticky navigation in normal mode and marks it for capture mode", () => {
    const source = fs.readFileSync(
      path.join(navigationDirectory, "app-navigation-ribbon-shell.tsx"),
      "utf8",
    );

    expect(source).toContain("sticky top-[var(--app-ribbon-top-offset,0rem)]");
    expect(source).toContain("data-cmm-capture-sticky");
    expect(source).toContain("data-cmm-capture-stabilize");
  });

  it("keeps Sommaire in the home block and responsive tree only", () => {
    const source = fs.readFileSync(
      path.join(navigationDirectory, "app-navigation-ribbon-shell.tsx"),
      "utf8",
    );

    expect(source).not.toContain("href={EXPLORER_ROUTE}");
    expect(source).not.toContain("<List");
    expect(source).toContain('className="lg:hidden"');
    expect(source).toContain("<AppNavigationTreeMenu");
  });

  it("keeps the desktop block navigation centered independently of side controls", () => {
    const source = fs.readFileSync(
      path.join(navigationDirectory, "app-navigation-ribbon-shell.tsx"),
      "utf8",
    );
    const searchIndex = source.indexOf("<GlobalSearch");
    const blockNavigationIndex = source.indexOf(
      'aria-label={locale === "fr" ? "Navigation par blocs" : "Block navigation"}',
    );

    expect(source).toContain(
      "xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
    );
    expect(source).toContain('max-w-[12rem]');
    expect(searchIndex).toBeGreaterThan(-1);
    expect(blockNavigationIndex).toBeGreaterThan(searchIndex);
    expect(source).toContain('xl:col-start-1');
    expect(source).toContain('xl:col-start-2');
    expect(source).toContain('xl:col-start-3');
  });

  it("uses a root capture attribute to make marked chrome static", () => {
    const source = fs.readFileSync(
      path.join(sourceDirectory, "styles/base.css"),
      "utf8",
    );

    expect(source).toContain(
      'html[data-cmm-capture-mode="true"] [data-cmm-capture-sticky]',
    );
    expect(source).toContain("position: static !important");
    expect(source).toContain(
      'html[data-cmm-capture-mode="true"] [data-cmm-capture-stabilize]',
    );
    expect(source).toContain("animation: none !important");
    expect(source).toContain("transition: none !important");
  });

  it("activates the same contract in the canonical full-page capture pipeline", () => {
    const source = fs.readFileSync(
      path.resolve(
        navigationDirectory,
        "../../../../../documentation/pages_site/screen/capture-pages.mjs",
      ),
      "utf8",
    );

    expect(source).toContain('targetUrlObject.searchParams.set("cmmCapture", "1")');
  });
});

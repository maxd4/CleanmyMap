import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const navigationDirectory = path.dirname(fileURLToPath(import.meta.url));

function readSource(fileName: string) {
  return fs.readFileSync(path.join(navigationDirectory, fileName), "utf8");
}

describe("desktop ribbon control geometry", () => {
  it("keeps the block navigation centered in the available utility interval", () => {
    const source = readSource("app-navigation-ribbon-shell.tsx");

    expect(source).toContain(
      "xl:grid-cols-[auto_minmax(15rem,1fr)_auto]",
    );
    expect(source).toContain('xl:col-start-1');
    expect(source).toContain('xl:col-start-2');
    expect(source).toContain('xl:col-start-3');
    expect(source).toContain('aria-label={locale === "fr" ? "Navigation par blocs" : "Block navigation"}');
    expect(source).toContain('className="flex w-[15rem] shrink-0 flex-nowrap items-center justify-center gap-0.5 rounded-full border border-white/8 bg-white/[0.05] p-px');
  });

  it("uses the canonical desktop height for home and search without changing mobile layout", () => {
    const ribbonSource = readSource("app-navigation-ribbon-shell.tsx");
    const searchSource = readSource("global-search.tsx");

    expect(ribbonSource).toContain("xl:h-10 xl:min-h-0");
    expect(searchSource).toContain("inline-flex h-10 min-h-10 w-10");
    expect(searchSource).toContain("xl:w-full xl:justify-between xl:px-2.5");
    expect(searchSource).toContain('panelAlignment="center"');
    expect(searchSource).toContain('panelClassName="w-[min(24rem,calc(100vw-1rem))]"');
    expect(ribbonSource).toContain("xl:w-[9rem] 2xl:w-[10rem]");
    expect(ribbonSource).toContain("w-[15rem] shrink-0 flex-nowrap items-center justify-center");
    expect(ribbonSource).toContain("<AppNavigationTreeMenu");
    expect(ribbonSource).toContain('cmm-navigation-group--product xl:order-none xl:hidden');
  });

  it("keeps the five block triggers stable while enlarging reduced-mode icons", () => {
    const source = readSource("app-navigation-block-dropdown.tsx");

    expect(source).toContain(
      'inline-flex h-8 w-9 shrink-0 items-center justify-center',
    );
    expect(source).not.toContain('"group inline-flex');
    expect(source).toContain('<CmmIcon icon={getNavigationBlockIcon(space.id)} size="lg" />');
    expect(source).not.toContain("group inline-flex h-11 w-11");
    expect(source).not.toContain("hover:scale");
  });

  it("keeps one classic desktop dock without variant or indicator branches", () => {
    const shellSource = readSource("app-navigation-ribbon-shell.tsx");
    const layoutSource = fs.readFileSync(
      path.resolve(navigationDirectory, "../../styles/layout.css"),
      "utf8",
    );

    expect(shellSource).toContain("data-navigation-ribbon aria-label");
    expect(layoutSource).toContain("border-color: color-mix(in srgb, #f6d365 56%, transparent)");
    expect(layoutSource).toContain("data-navigation-block-active=\"true\"");
    expect(layoutSource).toContain("var(--navigation-block-accent)");
  });

  it("aligns first-level menus, notification, profile and account controls only on desktop", () => {
    const menusSource = readSource("app-navigation-ribbon-menus.tsx");
    const notificationSource = readSource("notification-bell.tsx");
    const accountSource = readSource("../account/account-identity-chip.tsx");
    const ribbonAccountSource = readSource("app-navigation-ribbon-account.tsx");

    expect(menusSource.match(/xl:h-10/g)).toHaveLength(2);
    expect(notificationSource).toContain("xl:h-10 xl:w-10");
    expect(accountSource).toContain("min-[1440px]:h-10 min-[1440px]:min-h-0");
    expect(ribbonAccountSource).toContain("xl:h-10 xl:py-0");
    expect(ribbonAccountSource).toContain("xl:h-8 xl:w-8");
  });

  it("makes the right control zone shrinkable while compacting labels below xl", () => {
    const shellSource = readSource("app-navigation-ribbon-shell.tsx");
    const menusSource = readSource("app-navigation-ribbon-menus.tsx");
    const accountSource = readSource("app-navigation-ribbon-account.tsx");
    const identitySource = readSource("../account/account-identity-chip.tsx");
    const accountGroup = shellSource.match(
      /className="([^\"]*xl:col-start-3[^\"]*)"/,
    )?.[1];

    expect(accountGroup).toBeDefined();
    expect(accountGroup).toContain("xl:col-start-3");
    expect(shellSource).toContain("order-3 col-start-2 ml-auto");
    expect(shellSource).toContain("order-2 col-start-1 shrink-0");
    expect(shellSource).toContain("xl:grid-cols-[auto_minmax(15rem,1fr)_auto]");
    expect(shellSource).toContain("xl:col-start-1");
    expect(shellSource).toContain("xl:col-start-2");
    expect(shellSource).toContain("xl:col-start-3");
    expect(menusSource).toContain("min-[1440px]:inline");
    expect(menusSource).toContain("xl:h-10");
    expect(menusSource).not.toContain("lg:w-auto");
    expect(menusSource).not.toContain("lg:px-3");
    expect(accountSource).toContain("hidden min-w-0 flex-1 overflow-hidden leading-tight min-[1440px]:block");
    expect(identitySource).toContain("min-[1440px]:w-auto min-[1440px]:min-w-0");
  });

  it("keeps the shared icon scale contract explicit", () => {
    const source = fs.readFileSync(
      path.resolve(navigationDirectory, "../ui/cmm-icon.tsx"),
      "utf8",
    );

    expect(source).toContain('md: "h-5 w-5"');
    expect(source).toContain('lg: "h-6 w-6"');
  });
});

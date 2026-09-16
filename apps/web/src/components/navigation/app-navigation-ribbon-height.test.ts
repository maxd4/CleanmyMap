import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const navigationDirectory = path.dirname(fileURLToPath(import.meta.url));

function readSource(fileName: string) {
  return fs.readFileSync(path.join(navigationDirectory, fileName), "utf8");
}

describe("desktop ribbon control geometry", () => {
  it("keeps the block navigation on the independent center grid axis", () => {
    const source = readSource("app-navigation-ribbon-shell.tsx");

    expect(source).toContain(
      "xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
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
    expect(searchSource).toContain("inline-flex h-10 min-h-10 w-full");
    expect(searchSource).toContain('panelAlignment="start"');
    expect(ribbonSource).toContain("max-w-[18rem]");
    expect(ribbonSource).toContain("w-[15rem] shrink-0 flex-nowrap items-center justify-center");
    expect(ribbonSource).toContain("<AppNavigationTreeMenu");
    expect(ribbonSource).toContain('className="lg:hidden"');
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

  it("aligns first-level menus, notification, profile and account controls only on desktop", () => {
    const menusSource = readSource("app-navigation-ribbon-menus.tsx");
    const notificationSource = readSource("notification-bell.tsx");
    const accountSource = readSource("../account/account-identity-chip.tsx");
    const ribbonAccountSource = readSource("app-navigation-ribbon-account.tsx");

    expect(menusSource.match(/xl:h-10/g)).toHaveLength(2);
    expect(notificationSource).toContain("xl:h-10 xl:w-10");
    expect(accountSource).toContain("xl:h-10 xl:min-h-0");
    expect(ribbonAccountSource).toContain("xl:h-10 xl:py-0");
    expect(ribbonAccountSource).toContain("xl:h-8 xl:w-8");
  });

  it("makes the right control zone shrinkable while compacting labels below xl", () => {
    const shellSource = readSource("app-navigation-ribbon-shell.tsx");
    const menusSource = readSource("app-navigation-ribbon-menus.tsx");
    const accountSource = readSource("app-navigation-ribbon-account.tsx");
    const identitySource = readSource("../account/account-identity-chip.tsx");

    expect(shellSource).toContain(
      'className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2 lg:gap-2.5 xl:col-start-3 xl:ml-0 xl:justify-end"',
    );
    expect(menusSource).toContain("xl:w-auto xl:px-3 xl:h-10");
    expect(menusSource).not.toContain("lg:w-auto lg:px-3");
    expect(accountSource).toContain("hidden min-w-0 flex-1 leading-tight xl:block");
    expect(identitySource).toContain("xl:w-auto xl:min-w-0 xl:px-3 xl:h-10");
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

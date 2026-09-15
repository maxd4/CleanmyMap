"use client";

import { usePathname } from "next/navigation";

import { AppNavigationRibbonShell } from "./app-navigation-ribbon-shell";
import type { AppNavigationRibbonProps } from "./app-navigation-ribbon-account";

export function AppNavigationRibbon(props: AppNavigationRibbonProps) {
  const pathname = usePathname();

  return <AppNavigationRibbonShell {...props} pathname={pathname} />;
}

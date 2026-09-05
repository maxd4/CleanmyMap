"use client";

import { usePathname } from "next/navigation";

import { isProtectedRoutePath } from "@/lib/auth/protected-routes";

import {
  AppNavigationRibbonProtected,
  AppNavigationRibbonPublic,
} from "./app-navigation-ribbon-shell";
import type { AppNavigationRibbonProps } from "./app-navigation-ribbon-account";

export function AppNavigationRibbon(props: AppNavigationRibbonProps) {
  const pathname = usePathname();

  if (isProtectedRoutePath(pathname)) {
    return <AppNavigationRibbonProtected {...props} pathname={pathname} />;
  }

  return <AppNavigationRibbonPublic {...props} pathname={pathname} />;
}
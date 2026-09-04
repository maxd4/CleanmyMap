"use client";

import { usePathname } from "next/navigation";
import { AppNavigationRibbon } from "@/components/navigation/app-navigation-ribbon";
import { DeferredGlobalChrome } from "@/components/layout/deferred-global-chrome";

export function RootLayoutChrome() {
  const pathname = usePathname();
  if (pathname === "/onboarding") {
    return null;
  }

  return (
    <>
      <DeferredGlobalChrome />
      <AppNavigationRibbon />
    </>
  );
}

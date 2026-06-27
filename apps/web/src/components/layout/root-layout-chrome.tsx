"use client";

import { AppNavigationRibbon } from "@/components/navigation/app-navigation-ribbon";
import { DeferredGlobalChrome } from "@/components/layout/deferred-global-chrome";

export function RootLayoutChrome() {
  return (
    <>
      <DeferredGlobalChrome />
      <AppNavigationRibbon />
    </>
  );
}

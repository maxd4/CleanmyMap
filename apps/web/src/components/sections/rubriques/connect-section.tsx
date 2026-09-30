"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { useConnectData } from "./use-connect-data";
import type { ConnectTab } from "./connect-types";
import { useConnectNavigation } from "./connect-section-navigation";
import { ConnectSectionView } from "./connect-section-view";

export function ConnectSection({ defaultTab = "discussions" }: { defaultTab?: ConnectTab }) {
  const { locale, displayMode } = useSitePreferences();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const initialParam = searchParams.get("tab");
  const initialTab: ConnectTab = initialParam === "dm" || initialParam === "discussions" ? initialParam : defaultTab;
  const data = useConnectData(initialTab);
  const navigation = useConnectNavigation({ data, searchParams, pathname, router });
  const isStaticMotion = useReducedMotion() === true || displayMode === "sobre";
  const { activeTab, discussionChannelType, discussionTopicId, discussionRecipient, discussionMessageId, initialDiscussionNavigation, initialDmNavigation, handleNavigationChange, handleTabChange } = navigation;
  return <ConnectSectionView fr={locale === "fr"} activeTab={activeTab} setActiveTab={handleTabChange} isStaticMotion={isStaticMotion} discussion={{ ...data, initialChannelType: discussionChannelType, initialTopicId: discussionTopicId, recipient: discussionRecipient, messageId: discussionMessageId, navigationState: initialDiscussionNavigation }} dmNavigation={initialDmNavigation} shell={data} onNavigationChange={handleNavigationChange} />;
}

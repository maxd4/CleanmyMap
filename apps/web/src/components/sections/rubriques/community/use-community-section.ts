"use client";

import { useState } from "react";
import { useCommunityHighlights } from "./use-community-highlights";
import { useCommunityEvents } from "./use-community-events";
import { useCommunityActions } from "./use-community-actions";
import { toRsvpLabel } from "./helpers";
import type { CommunityTab, UseCommunitySectionModel } from "./types";

export function useCommunitySection(): UseCommunitySectionModel {
  const [activeTab, setActiveTab] = useState<CommunityTab>("upcoming");

  const highlightsHook = useCommunityHighlights();
  const eventsHook = useCommunityEvents(highlightsHook.actionItems);
  const actionsHook = useCommunityActions(eventsHook.reloadEvents);

  return {
    activeTab,
    setActiveTab,
    ...highlightsHook,
    ...eventsHook,
    ...actionsHook,
    toRsvpLabel,
  };
}

export type { UseCommunitySectionModel };

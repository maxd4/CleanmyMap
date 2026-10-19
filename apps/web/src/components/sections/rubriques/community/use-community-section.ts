"use client";

import { useState } from "react";
import { useCommunityEvents } from "./use-community-events";
import { useCommunityActions } from "./use-community-actions";
import { toRsvpLabel } from "./helpers";
import type { CommunityTab, UseCommunitySectionModel } from "./types";

export function useCommunitySection({ eventsEnabled = true }: { eventsEnabled?: boolean } = {}): UseCommunitySectionModel {
  const [activeTab, setActiveTab] = useState<CommunityTab>("upcoming");

  const eventsHook = useCommunityEvents(eventsEnabled);
  const actionsHook = useCommunityActions(eventsHook.reloadEvents);

  return {
    activeTab,
    setActiveTab,
    ...eventsHook,
    ...actionsHook,
    toRsvpLabel,
  };
}

export type { UseCommunitySectionModel };

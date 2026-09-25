"use client";

import { useMemo } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import useSWR from "swr";

import {
  fetchCurrentAccountIdentity,
  type CurrentAccountIdentity,
} from "@/lib/account/current-account-identity";
import {
  extractZoneContextFromMetadata,
} from "@/lib/chat/channels";
import { buildClerkSupabaseAccessTokenProvider } from "@/lib/clerk-supabase-token";
import { findZoneWithNeighbors } from "@/lib/geo/paris-neighborhood";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useChatSurfaceActivity } from "../chat-surface-activity-context";

import {
  getClerkArrondissement,
  getClerkRoleLabel,
  toMetadataRecord,
} from "../chat-shell.utils";

type UseChatShellRuntimeContextParams = {
  selectedZone: string;
  initialArrondissement?: number | null;
  enabled?: boolean;
};

export function useChatShellRuntimeContext({
  selectedZone,
  initialArrondissement,
  enabled = true,
}: UseChatShellRuntimeContextParams) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const userId = user?.id;
  const surfaceActive = useChatSurfaceActivity();

  const supabase = useMemo(() => {
    try {
      return getSupabaseBrowserClient(
        buildClerkSupabaseAccessTokenProvider(getToken),
      );
    } catch {
      return null;
    }
  }, [getToken]);

  const { data: currentAccountIdentity = null } = useSWR<CurrentAccountIdentity | null>(
    enabled && surfaceActive && userId ? ["current-account-identity", userId] : null,
    fetchCurrentAccountIdentity,
  );

  const currentRoleLabel = useMemo(() => getClerkRoleLabel(user), [user]);
  const clerkArrondissement = useMemo(
    () => getClerkArrondissement(user),
    [user],
  );
  const publicMetadata = useMemo(
    () => toMetadataRecord(user?.publicMetadata),
    [user?.publicMetadata],
  );
  const clerkZoneContext = useMemo(
    () => extractZoneContextFromMetadata(publicMetadata),
    [publicMetadata],
  );
  const profileDefaultZone = useMemo(
    () =>
      clerkZoneContext.zoneName ||
      (clerkZoneContext.arrondissementId
        ? `${clerkZoneContext.arrondissementId === 1 ? "1er" : `${clerkZoneContext.arrondissementId}e`} arrondissement`
        : clerkArrondissement
          ? `${clerkArrondissement === 1 ? "1er" : `${clerkArrondissement}e`} arrondissement`
          : ""),
    [clerkArrondissement, clerkZoneContext.arrondissementId, clerkZoneContext.zoneName],
  );
  const effectiveZone = useMemo(
    () =>
      selectedZone ||
      profileDefaultZone,
    [profileDefaultZone, selectedZone],
  );
  const territoryFocus = useMemo(
    () => selectedZone ? null : initialArrondissement ?? clerkZoneContext.arrondissementId ?? clerkArrondissement,
    [clerkArrondissement, clerkZoneContext.arrondissementId, initialArrondissement, selectedZone],
  );
  const hasArrondissement = useMemo(
    () => territoryFocus !== null || clerkArrondissement !== null,
    [territoryFocus, clerkArrondissement],
  );
  const hasGreaterParisZone = useMemo(
    () => effectiveZone !== "" && findZoneWithNeighbors(effectiveZone) !== null,
    [effectiveZone],
  );
  const senderDisplayName =
    currentAccountIdentity?.displayName ||
    user?.fullName ||
    user?.username ||
    "Moi";
  const senderHandle = currentAccountIdentity?.handle || user?.username || "moi";

  return {
    currentAccountIdentity,
    currentRoleLabel,
    effectiveZone,
    isProfileDefaultZone: !selectedZone && Boolean(profileDefaultZone),
    profileDefaultZone,
    hasArrondissement,
    hasGreaterParisZone,
    isLoaded,
    isSignedIn: isSignedIn === true,
    senderDisplayName,
    senderHandle,
    supabase,
    territoryFocus,
    user,
    userId,
  };
}

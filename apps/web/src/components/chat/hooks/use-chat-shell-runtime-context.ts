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

import {
  getClerkArrondissement,
  getClerkRoleLabel,
  toMetadataRecord,
} from "../chat-shell.utils";

type UseChatShellRuntimeContextParams = {
  selectedZone: string;
  initialArrondissement?: number;
};

export function useChatShellRuntimeContext({
  selectedZone,
  initialArrondissement,
}: UseChatShellRuntimeContextParams) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const userId = user?.id;

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
    userId ? ["current-account-identity", userId] : null,
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
  const effectiveZone = useMemo(
    () =>
      selectedZone ||
      clerkZoneContext.zoneName ||
      (clerkArrondissement ? `${clerkArrondissement}e arrondissement` : ""),
    [selectedZone, clerkZoneContext.zoneName, clerkArrondissement],
  );
  const territoryFocus = useMemo(
    () => initialArrondissement ?? clerkArrondissement,
    [initialArrondissement, clerkArrondissement],
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

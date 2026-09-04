import "server-only";

import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import {
  getDevAuthBypassRole,
  isDevAuthBypassForced,
  shouldUseDevAuthBypass,
} from "./dev-auth";
import {
  INACTIVE_LOCAL_DEV_AUTH,
  type LocalDevAuthState,
} from "./effective-auth-contract";

export async function getLocalDevAuthState(): Promise<LocalDevAuthState> {
  if (process.env.NODE_ENV !== "development") {
    return INACTIVE_LOCAL_DEV_AUTH;
  }

  let host: string | null = null;
  try {
    const requestHeaders = await headers();
    host = requestHeaders.get("host");
  } catch {
    return INACTIVE_LOCAL_DEV_AUTH;
  }

  let clerkUserId: string | null = null;
  if (!isDevAuthBypassForced()) {
    try {
      clerkUserId = (await auth()).userId ?? null;
    } catch {
      clerkUserId = null;
    }
  }

  if (!shouldUseDevAuthBypass({ hostname: host, clerkUserId })) {
    return INACTIVE_LOCAL_DEV_AUTH;
  }

  return {
    active: true,
    role: getDevAuthBypassRole(),
  };
}

import "server-only";

import { headers } from "next/headers";
import {
  getDevAuthBypassRole,
  isDevAuthBypassEnabled,
  isLocalhostHost,
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

  if (!isLocalhostHost(host) || !isDevAuthBypassEnabled(host)) {
    return INACTIVE_LOCAL_DEV_AUTH;
  }

  return {
    active: true,
    role: getDevAuthBypassRole(),
  };
}

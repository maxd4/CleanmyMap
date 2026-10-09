import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";

const PAGE_SIZE = 10;
const MAX_QUERY_LENGTH = 120;
const ACCOUNT_OPTIONS_CACHE_HEADERS = {
  "Cache-Control": "private, no-store",
};

type ClerkUserForActionPicker = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
};

export type ActionAccountOption = {
  id: string;
  display_name: string;
  handle: string | null;
};

function parseOffset(value: string | null): number {
  const parsed = Number(value ?? "0");
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizeQuery(value: string | null): string {
  return (value ?? "").trim().slice(0, MAX_QUERY_LENGTH);
}

function parseIncludeCurrentUser(value: string | null): boolean {
  return value === "1" || value === "true";
}

function toActionAccountOption(user: ClerkUserForActionPicker): ActionAccountOption {
  const displayName = [user.firstName?.trim() ?? "", user.lastName?.trim() ?? ""]
    .filter(Boolean)
    .join(" ");

  return {
    id: user.id,
    display_name: displayName || user.username?.trim() || user.id,
    handle: user.username?.trim().replace(/^@+/, "") || null,
  };
}

async function loadEligibleAccounts(params: {
  currentUserId: string;
  query: string;
  offset: number;
  includeCurrentUser: boolean;
}) {
  const client = await clerkClient();
  const accounts: ActionAccountOption[] = [];
  const seenIds = new Set<string>();
  let scanOffset = params.offset;
  let totalCount = params.offset;

  while (accounts.length < PAGE_SIZE) {
    const page = await client.users.getUserList({
      ...(params.query ? { query: params.query } : {}),
      orderBy: "-last_active_at",
      limit: PAGE_SIZE,
      offset: scanOffset,
    });
    const users = page.data as ClerkUserForActionPicker[];
    totalCount = page.totalCount;

    for (const user of users) {
      scanOffset += 1;
      if ((!params.includeCurrentUser && user.id === params.currentUserId) || seenIds.has(user.id)) {
        continue;
      }
      seenIds.add(user.id);
      accounts.push(toActionAccountOption(user));
      if (accounts.length === PAGE_SIZE) {
        break;
      }
    }

    if (users.length < PAGE_SIZE || scanOffset >= totalCount) {
      break;
    }
  }

  const hasMore = scanOffset < totalCount;
  return {
    users: accounts,
    nextOffset: hasMore ? scanOffset : null,
    hasMore,
  };
}

export async function GET(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }

  const { searchParams } = new URL(request.url);
  const query = normalizeQuery(searchParams.get("q"));
  const offset = parseOffset(searchParams.get("offset"));
  const includeCurrentUser = parseIncludeCurrentUser(searchParams.get("includeCurrentUser"));

  try {
    const result = await loadEligibleAccounts({
      currentUserId: access.userId,
      query,
      offset,
      includeCurrentUser,
    });
    return NextResponse.json(result, {
      headers: ACCOUNT_OPTIONS_CACHE_HEADERS,
    });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/account-options");
  }
}

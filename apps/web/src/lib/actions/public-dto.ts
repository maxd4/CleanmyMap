import type { ActionDataContract } from "./contracts/contract-model";
import {
  toActionListItem,
  toActionMapItem,
} from "./contracts/contract-mappers";
import type {
  ActionListItem,
  ActionListResponse,
  ActionMapItem,
  ActionMapResponse,
} from "./types";

type PublicActionContract = Omit<ActionDataContract, "createdByClerkId">;

type PublicActionListItem = Omit<
  ActionListItem,
  "created_by_clerk_id" | "contract"
> & {
  contract?: PublicActionContract;
};

type PublicActionListResponse = Omit<ActionListResponse, "items"> & {
  items: PublicActionListItem[];
};

export type PublicActionMapItem = Omit<
  ActionMapItem,
  "created_by_clerk_id" | "contract"
> & {
  contract?: PublicActionContract;
};

export type PublicActionMapResponse = Omit<ActionMapResponse, "items"> & {
  items: PublicActionMapItem[];
};

const PRIVATE_IDENTITY_KEYS = new Set([
  "created_by_clerk_id",
  "createdByClerkId",
  "user_id",
  "userId",
  "owner_clerk_id",
  "ownerClerkId",
  "organizer_clerk_id",
  "organizerClerkId",
  "participant_clerk_id",
  "participantClerkId",
  "actor_user_id",
  "actorUserId",
]);

function stripPrivateIdentityKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripPrivateIdentityKeys);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !PRIVATE_IDENTITY_KEYS.has(key))
      .map(([key, entry]) => [key, stripPrivateIdentityKeys(entry)]),
  );
}

function projectPublicActionListItem(
  item: ActionListItem,
): PublicActionListItem {
  return stripPrivateIdentityKeys(item) as PublicActionListItem;
}

export function toPublicActionListItem(
  ...params: Parameters<typeof toActionListItem>
): PublicActionListItem {
  return projectPublicActionListItem(toActionListItem(...params));
}

export function toPublicActionListResponse(
  response: ActionListResponse,
): PublicActionListResponse {
  return stripPrivateIdentityKeys(response) as PublicActionListResponse;
}

export function projectPublicActionMapItem(item: ActionMapItem): PublicActionMapItem {
  return stripPrivateIdentityKeys(item) as PublicActionMapItem;
}

export function toPublicActionMapItem(
  ...params: Parameters<typeof toActionMapItem>
): PublicActionMapItem {
  return projectPublicActionMapItem(toActionMapItem(...params));
}

export function toPublicActionMapResponse(
  response: ActionMapResponse,
): PublicActionMapResponse {
  return stripPrivateIdentityKeys(response) as PublicActionMapResponse;
}

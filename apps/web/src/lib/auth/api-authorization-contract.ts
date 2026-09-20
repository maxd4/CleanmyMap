import type { ApiAuthorizationContract } from "./api-authorization-contract.types";
import { assertNoApiAuthorizationContractKeyCollisions } from "./api-authorization-contract.assembly";
import { accountAnalyticsAuthorizationContract } from "./api-authorization-contract.account-analytics";
import { actionsAuthorizationContract } from "./api-authorization-contract.actions";
import { adminCommunityAuthorizationContract } from "./api-authorization-contract.admin-community";
import { chatAuthorizationContract } from "./api-authorization-contract.chat";
import { platformAuthorizationContract } from "./api-authorization-contract.platform";

export type {
  ApiAuthorizationDimension,
  ApiAuthorizationContractEntry,
  ApiHttpMethod,
} from "./api-authorization-contract.types";

const contractFragments = [
  { name: "account-analytics", contract: accountAnalyticsAuthorizationContract },
  { name: "actions", contract: actionsAuthorizationContract },
  { name: "admin-community", contract: adminCommunityAuthorizationContract },
  { name: "chat", contract: chatAuthorizationContract },
  { name: "platform", contract: platformAuthorizationContract },
] as const;

assertNoApiAuthorizationContractKeyCollisions(contractFragments);

/**
 * Handler-level authorization contract for the API routes that require an
 * explicit method-level decision.
 *
 * The inventory test derives the route/method keys from route.ts files and
 * requires every non-public entry to expose the guard evidence listed here.
 * This keeps the proxy family list separate from the authorization decision
 * made by each handler.
 */
export const API_AUTHORIZATION_CONTRACT = {
  ...accountAnalyticsAuthorizationContract,
  ...actionsAuthorizationContract,
  ...adminCommunityAuthorizationContract,
  ...chatAuthorizationContract,
  ...platformAuthorizationContract,
} as const satisfies ApiAuthorizationContract;

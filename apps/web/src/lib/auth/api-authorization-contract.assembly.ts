import type { ApiAuthorizationContract } from "./api-authorization-contract.types";

type NamedApiAuthorizationContractFragment = {
  name: string;
  contract: ApiAuthorizationContract;
};

export function assertNoApiAuthorizationContractKeyCollisions(
  fragments: readonly NamedApiAuthorizationContractFragment[],
): void {
  const owners = new Map<string, string>();

  for (const fragment of fragments) {
    for (const routeKey of Object.keys(fragment.contract)) {
      const previousOwner = owners.get(routeKey);
      if (previousOwner) {
        throw new Error(
          `Duplicate API authorization contract key "${routeKey}" in fragments "${previousOwner}" and "${fragment.name}"`,
        );
      }
      owners.set(routeKey, fragment.name);
    }
  }
}

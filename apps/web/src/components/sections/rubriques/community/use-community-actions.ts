import { useAuth, useClerk } from "@clerk/nextjs";
import { useCommunityActionMutations } from "./use-community-actions.mutations";

export function useCommunityActions(reloadEvents: () => Promise<unknown>) {
  const { isLoaded, isSignedIn } = useAuth();
  const { redirectToSignIn } = useClerk();
  return useCommunityActionMutations({ isLoaded, isSignedIn, redirectToSignIn, reloadEvents });
}

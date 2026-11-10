import { useAuth, useClerk } from "@clerk/nextjs";
import { buildCurrentInternalRoute } from "@/lib/auth/redirect-url";
import { useCommunityActionMutations } from "./use-community-actions.mutations";

export function useCommunityActions(reloadEvents: () => Promise<unknown>) {
  const { isLoaded, isSignedIn } = useAuth();
  const { redirectToSignIn } = useClerk();
  return useCommunityActionMutations({
    isLoaded,
    isSignedIn,
    redirectToSignIn: () => {
      const currentRoute = typeof window === "undefined"
        ? "/"
        : buildCurrentInternalRoute(window.location.pathname, window.location.search, window.location.hash);
      void /* fire-and-forget -- the community auth boundary owns sign-in navigation. */ redirectToSignIn({ redirectUrl: currentRoute });
    },
    reloadEvents,
  });
}

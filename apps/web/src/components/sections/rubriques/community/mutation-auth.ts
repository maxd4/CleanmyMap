export const COMMUNITY_RETURN_PATH = "/sections/community";

type RedirectToSignIn = (options?: { redirectUrl?: string | null }) => unknown;

export function redirectToCommunitySignIn(
  redirectToSignIn: RedirectToSignIn,
): void {
  void redirectToSignIn({ redirectUrl: COMMUNITY_RETURN_PATH });
}

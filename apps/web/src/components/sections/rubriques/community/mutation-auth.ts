export const COMMUNITY_RETURN_PATH = "/sections/community";

export function canOpenCommunityCreateForm(
  isLoaded: boolean,
  isSignedIn: boolean | undefined,
): boolean {
  return isLoaded && isSignedIn === true;
}

type RedirectToSignIn = (options?: { redirectUrl?: string | null }) => unknown;

export function redirectToCommunitySignIn(
  redirectToSignIn: RedirectToSignIn,
): void {
  void redirectToSignIn({ redirectUrl: COMMUNITY_RETURN_PATH });
}

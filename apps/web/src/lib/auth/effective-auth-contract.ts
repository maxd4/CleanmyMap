export type LocalDevAuthState =
  | { active: false; role: null }
  | { active: true; role: string };

export type EffectiveAuthState = {
  isLoaded: boolean;
  isSignedIn: boolean;
  isDevBypass: boolean;
};

export const INACTIVE_LOCAL_DEV_AUTH: LocalDevAuthState = {
  active: false,
  role: null,
};

export function mergeEffectiveAuthState(
  clerkState: Pick<EffectiveAuthState, "isLoaded" | "isSignedIn">,
  localDevAuth: LocalDevAuthState,
): EffectiveAuthState {
  if (localDevAuth.active) {
    return {
      isLoaded: true,
      isSignedIn: true,
      isDevBypass: true,
    };
  }

  return {
    isLoaded: clerkState.isLoaded,
    isSignedIn: clerkState.isSignedIn,
    isDevBypass: false,
  };
}

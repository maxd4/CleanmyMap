"use client";

import { useUser } from "@clerk/nextjs";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  INACTIVE_LOCAL_DEV_AUTH,
  mergeEffectiveAuthState,
  type EffectiveAuthState,
  type LocalDevAuthState,
} from "./effective-auth-contract";

const LocalDevAuthStateContext = createContext<LocalDevAuthState>(
  INACTIVE_LOCAL_DEV_AUTH,
);

export function EffectiveAuthStateProvider({
  localDevAuth,
  children,
}: {
  localDevAuth: LocalDevAuthState;
  children: ReactNode;
}) {
  return (
    <LocalDevAuthStateContext.Provider value={localDevAuth}>
      {children}
    </LocalDevAuthStateContext.Provider>
  );
}

export function useEffectiveAuthState(): EffectiveAuthState {
  const { isLoaded, isSignedIn } = useUser();
  const localDevAuth = useContext(LocalDevAuthStateContext);

  return useMemo(
    () =>
      mergeEffectiveAuthState(
        { isLoaded, isSignedIn: Boolean(isSignedIn) },
        localDevAuth,
      ),
    [isLoaded, isSignedIn, localDevAuth],
  );
}

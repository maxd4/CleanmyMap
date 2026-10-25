"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";

import { readAppErrorResponse } from "@/lib/errors/app-errors";
import { logFailure } from "@/lib/logging/failure-log";

type UseChatShellProfileActionsParams = {
  newHandle: string;
  setIsEditingHandle: Dispatch<SetStateAction<boolean>>;
};

export function useChatShellProfileActions({
  newHandle,
  setIsEditingHandle,
}: UseChatShellProfileActionsParams) {
  return useCallback(async () => {
    if (!newHandle.trim()) return;
    try {
      const res = await fetch("/api/users/profile/handle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: newHandle }),
      });
      if (res.ok) {
        setIsEditingHandle(false);
        location.reload();
      } else {
        const error = await readAppErrorResponse(
          res,
          "Impossible de mettre à jour votre profil. Veuillez réessayer.",
        );
        alert(error.message);
      }
    } catch (err) {
      logFailure("ChatShell", "Handle update failed", err, {
        handle: newHandle,
      });
    }
  }, [newHandle, setIsEditingHandle]);
}

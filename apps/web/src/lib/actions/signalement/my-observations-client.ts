"use client";

import { useEffect, useMemo, useState } from "react";
import {
  isMyObservation,
  type MyObservation,
} from "./my-observations-contract";

export type MyObservationsReadStatus = "idle" | "loading" | "ready" | "empty" | "error";

export type MyObservationsReadSnapshot = {
  status: MyObservationsReadStatus;
  items: MyObservation[];
  error: MyObservationsReadError | null;
};

export class MyObservationsReadError extends Error {
  constructor(message: string, public readonly code: "request" | "invalid") {
    super(message);
    this.name = "MyObservationsReadError";
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" && body.error.trim()
      ? body.error
      : "Mes observations n'ont pas pu être chargées.";
  } catch {
    return "Mes observations n'ont pas pu être chargées.";
  }
}

export async function fetchMyObservations(): Promise<MyObservation[]> {
  const response = await fetch("/api/signalements/me", {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new MyObservationsReadError(await parseError(response), "request");
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new MyObservationsReadError(
      "La réponse de mes observations est invalide.",
      "invalid",
    );
  }

  const rawItems = (body as { items?: unknown })?.items;
  if (!Array.isArray(rawItems) || !rawItems.every(isMyObservation)) {
    throw new MyObservationsReadError(
      "La réponse de mes observations est invalide.",
      "invalid",
    );
  }
  return rawItems;
}

export function createMyObservationsReadController(
  onChange: (snapshot: MyObservationsReadSnapshot) => void,
  fetcher: () => Promise<MyObservation[]> = fetchMyObservations,
) {
  let snapshot: MyObservationsReadSnapshot = {
    status: "idle",
    items: [],
    error: null,
  };
  let inFlight: Promise<void> | null = null;

  const emit = (next: MyObservationsReadSnapshot) => {
    snapshot = next;
    onChange(next);
  };

  const load = (): Promise<void> => {
    if (["loading", "ready", "empty"].includes(snapshot.status)) {
      return inFlight ?? Promise.resolve();
    }
    if (inFlight) return inFlight;

    emit({ status: "loading", items: [], error: null });
    inFlight = fetcher()
      .then((items) => {
        emit({
          status: items.length > 0 ? "ready" : "empty",
          items,
          error: null,
        });
      })
      .catch((error: unknown) => {
        const normalized =
          error instanceof MyObservationsReadError
            ? error
            : new MyObservationsReadError(
                "Mes observations n'ont pas pu être chargées.",
                "request",
              );
        emit({ status: "error", items: [], error: normalized });
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };

  const refresh = (): Promise<void> => {
    if (inFlight) return inFlight;
    snapshot = { status: "idle", items: [], error: null };
    return load();
  };

  return {
    getSnapshot: () => snapshot,
    load,
    refresh,
    retry: () => (snapshot.status === "error" ? load() : Promise.resolve()),
  };
}

export function useMyObservations() {
  const [, forceRender] = useState(0);
  const controller = useMemo(
    () =>
      createMyObservationsReadController(() => {
        forceRender((value) => value + 1);
      }),
    [],
  );

  useEffect(() => {
    void controller.load();
  }, [controller]);

  return {
    snapshot: controller.getSnapshot(),
    refresh: controller.refresh,
    retry: controller.retry,
  };
}

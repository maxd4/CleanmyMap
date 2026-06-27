import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import type { PackType } from "./weather-types";

function serializeChecks(checks: Record<string, boolean>): string {
  return JSON.stringify(
    Object.keys(checks)
      .sort()
      .map((key) => [key, checks[key]]),
  );
}

export function useKitData(fr: boolean) {
  const { isLoaded, user } = useUser();
  const [packType, setPackType] = useState<PackType>("team");
  const [kitChecks, setKitChecks] = useState<Record<string, boolean>>({
    ppe: false,
    bags: false,
    tools: false,
    briefing: false,
  });
  const [kitReadyForUser, setKitReadyForUser] = useState<boolean>(false);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kitReady = !isLoaded || !user || kitReadyForUser;

  const packItems = useMemo(() => {
    if (packType === "solo") {
      return [
        fr ? "1 paire de gants" : "1 pair of gloves",
        fr ? "2 sacs différenciés" : "2 separate bags",
        fr ? "1 pince" : "1 picker",
        fr ? "1 bouteille d'eau" : "1 water bottle",
        fr ? "téléphone chargé" : "charged phone",
      ];
    }
    if (packType === "school") {
      return [
        fr ? "20 paires de gants" : "20 pairs of gloves",
        fr ? "40 sacs différenciés" : "40 separate bags",
        fr ? "6 pinces" : "6 pickers",
        fr ? "kit signalétique" : "signage kit",
        fr ? "briefing sécurité imprimé" : "printed safety briefing",
      ];
    }
    return [
      fr ? "10 paires de gants" : "10 pairs of gloves",
      fr ? "20 sacs différenciés" : "20 separate bags",
      fr ? "4 pinces" : "4 pickers",
      fr ? "2 contenants mégots" : "2 butt containers",
      fr ? "gilet haute visibilité x5" : "5 high-visibility vests",
    ];
  }, [packType, fr]);

  const kitProgress = Math.round(
    (Object.values(kitChecks).filter(Boolean).length / Object.values(kitChecks).length) * 100,
  );

  const toggleItem = (item: string) => {
    setKitChecks((current) => ({
      ...current,
      [item]: !current[item],
    }));
  };

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!user) {
      return;
    }

    let active = true;
    void fetch("/api/users/checklist-progress?checklistId=kit-main")
      .then(async (res) => {
        if (!res.ok) return;
        const payload = (await res.json()) as { entry?: { checks?: Record<string, boolean> } };
        if (active && payload.entry?.checks) {
          lastSavedSnapshotRef.current = serializeChecks(payload.entry.checks);
          setKitChecks((prev) => ({ ...prev, ...payload.entry?.checks }));
        }
      })
      .finally(() => {
        if (active) setKitReadyForUser(true);
      });
    return () => {
      active = false;
    };
  }, [isLoaded, user]);

  useEffect(() => {
    if (!kitReady || !user) return;

    const snapshot = serializeChecks(kitChecks);
    if (snapshot === lastSavedSnapshotRef.current) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      void fetch("/api/users/checklist-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklistId: "kit-main", checks: kitChecks }),
      })
        .then(() => {
          lastSavedSnapshotRef.current = snapshot;
        })
        .catch(() => undefined)
        .finally(() => {
          if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
          }
        });
    }, 600);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [kitChecks, kitReady, user]);

  return {
    packType,
    setPackType,
    kitChecks,
    setKitChecks,
    toggleItem,
    kitProgress,
    packItems,
    kitReady,
  };
}

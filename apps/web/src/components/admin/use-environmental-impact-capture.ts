import { useCallback, useState } from "react";
import type { EnvironmentalImpactCaptureResponse } from "./environmental-impact-capture-panel.model";

export function useEnvironmentalImpactCapture() {
  const [result, setResult] = useState<EnvironmentalImpactCaptureResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const triggerCapture = useCallback(() => {
    setIsPending(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch("/api/admin/environmental-impact?historyLimit=12", {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
        });

        const payload = (await response.json().catch(() => null)) as
          | EnvironmentalImpactCaptureResponse
          | null;

        if (!response.ok || !payload) {
          throw new Error(payload?.error ?? `Erreur API (${response.status})`);
        }

        setResult(payload);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Capture impossible.");
      } finally {
        setIsPending(false);
      }
    })();
  }, []);

  return { result, error, isPending, triggerCapture };
}

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  calculateAverageWeeklyKg,
  createInitialCodexUsageForm,
  serializeCodexUsageForm,
  type CodexUsageAdminResponse,
  type CodexUsageFormField,
  type CodexUsageFormState,
} from "./codex-usage-panel.model";

const ENDPOINT = "/api/admin/codex-usage?historyLimit=12";

async function readAdminResponse(response: Response): Promise<CodexUsageAdminResponse> {
  const payload = (await response.json().catch(() => null)) as CodexUsageAdminResponse | null;
  if (!response.ok || !payload) {
    throw new Error(payload?.error ?? `Erreur API (${response.status})`);
  }

  return payload;
}

export function useCodexUsagePanel() {
  const [result, setResult] = useState<CodexUsageAdminResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<CodexUsageFormState>(() => createInitialCodexUsageForm());

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const response = await fetch(ENDPOINT, {
          headers: { Accept: "application/json" },
        });
        const payload = await readAdminResponse(response);
        if (isMounted) {
          setResult(payload);
        }
      } catch (cause) {
        if (isMounted) {
          setError(cause instanceof Error ? cause.message : "Chargement impossible.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateField = useCallback((field: CodexUsageFormField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const save = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(serializeCodexUsageForm(form)),
      });
      const payload = await readAdminResponse(response);
      setResult(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enregistrement impossible.");
    } finally {
      setIsSaving(false);
    }
  }, [form]);

  const latestSnapshot = result?.latest ?? result?.snapshots?.[0] ?? null;
  const aggregate = result?.aggregate ?? null;

  return {
    aggregate,
    averageWeeklyKg: calculateAverageWeeklyKg(aggregate),
    error,
    form,
    isLoading,
    isSaving,
    latestSnapshot,
    result,
    save,
    updateField,
  };
}

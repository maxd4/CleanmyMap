"use client";

import { useEffect, useState } from "react";
import { parseFundingAggregate, parseFundingReturn, type FundingAggregateResponse, type FundingReturnState } from "@/lib/funding/public-aggregate";

type AggregateRead = { revision: number; data: FundingAggregateResponse | null };

export function useFundingPublicSummary(status: string | null, sessionId: string | null) {
  const [revision, setRevision] = useState(0);
  const [read, setRead] = useState<AggregateRead | null>(null);
  const [receipt, setReceipt] = useState<{ sessionId: string; state: FundingReturnState } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      let data: FundingAggregateResponse | null = null;
      try {
        const response = await fetch("/api/funding/aggregate", { cache: "no-store", signal: controller.signal });
        if (response.ok) data = parseFundingAggregate(await response.json());
      } catch { /* A failed request is represented as unavailable. */ }
      if (!controller.signal.aborted) setRead({ revision, data });
    }
    void load();
    return () => controller.abort();
  }, [revision]);

  const validSession = Boolean(sessionId && /^cs_[A-Za-z0-9_]+$/.test(sessionId) && sessionId.length <= 255);
  useEffect(() => {
    if (status !== "success" || !sessionId || !validSession) return;
    const controller = new AbortController();
    async function verify(id: string) {
      let state: FundingReturnState = "unavailable";
      try {
        const response = await fetch(`/api/funding/checkout-status?session_id=${encodeURIComponent(id)}`, {
          cache: "no-store", signal: controller.signal,
        });
        if (response.ok) state = parseFundingReturn(await response.json());
      } catch { /* No confirmation can be inferred from an error. */ }
      if (controller.signal.aborted) return;
      setReceipt({ sessionId: id, state });
      if (state === "paid" || state === "partially_refunded" || state === "refunded") setRevision(current => current + 1);
    }
    void verify(sessionId);
    return () => controller.abort();
  }, [status, sessionId, validSession]);

  const currentRead = read && read.revision === revision ? read : null;
  return {
    aggregate: currentRead?.data ?? null,
    aggregateState: !currentRead ? "loading" as const : currentRead.data ? "ready" as const : "error" as const,
    retry: () => setRevision(current => current + 1),
    returnState: !validSession ? "unavailable" as const : receipt && receipt.sessionId === sessionId ? receipt.state : "checking" as const,
  };
}

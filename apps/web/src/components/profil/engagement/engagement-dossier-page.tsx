"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import type {
  EngagementProofParticipationItem,
  PersonalEngagementProofProjection,
} from "@/lib/actions/engagement-proof-projection.types";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmGrid, CmmGridItem } from "@/components/ui/cmm-grid";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { PageHeader } from "@/components/ui/page-header";
import { EngagementAttestationPdfSection } from "./engagement-attestation-pdf-section";
import {
  EngagementParticipationSelector,
  EngagementPersonalFieldsForm,
  EngagementSelectionSummary,
  type EngagementDossierFormState,
} from "./engagement-dossier-sections";

const INITIAL_FORM_STATE: EngagementDossierFormState = {
  holderName: "",
  motivations: "",
  perceivedSkills: "",
  observations: "",
  attestationReferences: "",
  publicLinks: "",
  otherDocuments: "",
};

type LoadState =
  | { kind: "loading" }
  | { kind: "unauthenticated" }
  | { kind: "error"; message: string }
  | { kind: "ready"; projection: PersonalEngagementProofProjection };

function extractDownloadFilename(headerValue: string | null): string {
  const match = headerValue?.match(/filename="([^"]+)"/);
  return match?.[1] || `dossier-benevolat-${new Date().toISOString().slice(0, 10)}.md`;
}

export function EngagementDossierPage() {
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<EngagementDossierFormState>(INITIAL_FORM_STATE);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const applyProjectionResponse = useCallback(
    async (response: Response, isCancelled?: () => boolean) => {
      if (isCancelled?.()) return;
      if (response.status === 401) {
        setLoadState({ kind: "unauthenticated" });
        return;
      }
      const body = (await response.json()) as PersonalEngagementProofProjection & {
        error?: string;
      };
      if (isCancelled?.()) return;
      if (!response.ok || body.status !== "available" || !body.participations?.value) {
        setLoadState({
          kind: "error",
          message:
            body.error ||
            body.errorReason ||
            "Impossible de charger vos preuves d’engagement.",
        });
        return;
      }
      setLoadState({ kind: "ready", projection: body });
      setSelectedIds(new Set(body.participations.value.map((item) => item.actionId)));
    },
    [],
  );

  const loadProjection = useCallback(async () => {
    setLoadState({ kind: "loading" });
    try {
      const response = await fetch("/api/account/engagement-proofs", {
        cache: "no-store",
      });
      await applyProjectionResponse(response);
    } catch {
      setLoadState({
        kind: "error",
        message: "Erreur réseau lors du chargement de vos preuves d’engagement.",
      });
    }
  }, [applyProjectionResponse]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/engagement-proofs", { cache: "no-store" })
      .then((response) => applyProjectionResponse(response, () => cancelled))
      .catch(() => {
        if (!cancelled) {
          setLoadState({
            kind: "error",
            message: "Erreur réseau lors du chargement de vos preuves d’engagement.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [applyProjectionResponse]);

  const allItems = useMemo<EngagementProofParticipationItem[]>(() => {
    if (loadState.kind !== "ready") return [];
    return loadState.projection.participations.value ?? [];
  }, [loadState]);

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const date = item.actionDate.slice(0, 10);
      if (periodStart && date < periodStart) return false;
      if (periodEnd && date > periodEnd) return false;
      return true;
    });
  }, [allItems, periodStart, periodEnd]);

  const selectedFilteredItems = useMemo(
    () => filteredItems.filter((item) => selectedIds.has(item.actionId)),
    [filteredItems, selectedIds],
  );

  const handleToggle = useCallback((actionId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(actionId)) {
        next.delete(actionId);
      } else {
        next.add(actionId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filteredItems.map((item) => item.actionId)));
  }, [filteredItems]);

  const handleClearAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportError(null);
    setExportMessage(null);
    try {
      const response = await fetch("/api/account/engagement-proofs/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          holderName: form.holderName || null,
          periodStart: periodStart || null,
          periodEnd: periodEnd || null,
          selectedActionIds: selectedFilteredItems.map((item) => item.actionId),
          personalPresentation: {
            motivations: form.motivations || null,
            perceivedSkills: form.perceivedSkills || null,
            observations: form.observations || null,
          },
          complementaryDocuments: {
            attestationReferences: form.attestationReferences || null,
            publicLinks: form.publicLinks || null,
            otherDocuments: form.otherDocuments || null,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setExportError(
          errorBody?.error || "La génération du dossier Markdown a échoué.",
        );
        return;
      }

      const markdownText = await response.text();
      const blob = new Blob([markdownText], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = extractDownloadFilename(
        response.headers.get("Content-Disposition"),
      );
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setExportMessage("Dossier Markdown privé téléchargé.");
    } catch {
      setExportError("Erreur réseau lors de la génération du dossier Markdown.");
    } finally {
      setExporting(false);
    }
  }, [form, periodStart, periodEnd, selectedFilteredItems]);

  return (
    <CmmGrid contentClassName="gap-6 pb-16">
      <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/profil/impact"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-600 hover:text-red-600 dark:text-slate-300"
          >
            <ArrowLeft size={14} />
            Retour à mon impact
          </Link>
          <Link
            href="/reports"
            className="text-xs font-bold text-slate-600 underline-offset-4 hover:underline dark:text-slate-300"
          >
            Consulter les rapports collectifs
          </Link>
        </div>
        <PageHeader
          title="Valoriser mon engagement"
          subtitle="Exportez un dossier Markdown privé fondé sur vos présences confirmées et missions attestées."
          align="left"
        />
      </CmmGridItem>

      <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
        {loadState.kind === "loading" ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 text-center text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
          >
            Chargement de vos preuves d’engagement…
          </div>
        ) : loadState.kind === "unauthenticated" ? (
          <ClerkRequiredGate
            isAuthenticated={false}
            mode="blur"
            title="Dossier personnel de bénévolat"
            description="Connectez-vous pour consulter vos participations confirmées et exporter votre dossier privé."
            lockedPreview={<div className="h-32" />}
          >
            <div />
          </ClerkRequiredGate>
        ) : loadState.kind === "error" ? (
          <div
            role="alert"
            className="space-y-4 rounded-[2rem] border border-rose-300 bg-rose-50 p-6 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100"
          >
            <p className="font-bold">{loadState.message}</p>
            <CmmButton type="button" tone="secondary" size="sm" onClick={() => void loadProjection()}>
              <RefreshCw size={14} />
              Réessayer
            </CmmButton>
          </div>
        ) : (
          <div className="space-y-6">
            <section
              aria-label="Filtre de période"
              className="flex flex-wrap items-end gap-4 rounded-[2rem] border border-slate-200 bg-white/90 p-6 dark:border-slate-800 dark:bg-slate-900/80"
            >
              <div>
                <label
                  htmlFor="engagement-period-start"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  Du
                </label>
                <input
                  id="engagement-period-start"
                  type="date"
                  value={periodStart}
                  onChange={(event) => setPeriodStart(event.target.value)}
                  className="mt-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="engagement-period-end"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  Au
                </label>
                <input
                  id="engagement-period-end"
                  type="date"
                  value={periodEnd}
                  onChange={(event) => setPeriodEnd(event.target.value)}
                  className="mt-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              {(periodStart || periodEnd) && (
                <CmmButton
                  type="button"
                  tone="tertiary"
                  size="sm"
                  onClick={() => {
                    setPeriodStart("");
                    setPeriodEnd("");
                  }}
                >
                  Réinitialiser la période
                </CmmButton>
              )}
              <div className="ml-auto flex items-center gap-3">
                <CmmButton
                  type="button"
                  tone="primary"
                  disabled={exporting}
                  onClick={() => void handleExport()}
                >
                  <Download size={16} />
                  {exporting ? "Génération en cours…" : "Télécharger le dossier (.md)"}
                </CmmButton>
              </div>
            </section>

            <div aria-live="polite" aria-atomic="true" className="min-h-6">
              {exportMessage ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200">
                  {exportMessage}
                </p>
              ) : null}
              {exportError ? (
                <p
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-200"
                >
                  {exportError}
                </p>
              ) : null}
            </div>

            <EngagementSelectionSummary selectedItems={selectedFilteredItems} />

            <EngagementParticipationSelector
              items={filteredItems}
              selectedIds={selectedIds}
              onToggle={handleToggle}
              onSelectAll={handleSelectAll}
              onClearAll={handleClearAll}
            />

            <EngagementPersonalFieldsForm
              form={form}
              onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            />

            <EngagementAttestationPdfSection selectedItems={selectedFilteredItems} />
          </div>
        )}
      </CmmGridItem>
    </CmmGrid>
  );
}

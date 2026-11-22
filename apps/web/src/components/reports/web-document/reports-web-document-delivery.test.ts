import * as React from "react";
import { readFileSync } from "node:fs";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FileText, Loader2, TriangleAlert } from "lucide-react";
import {
  ReportsWebDocumentDelivery,
  ReportsWebDocumentDeliveryHistory,
  type ReportsWebDocumentExportStatus,
  type ReportsWebDocumentHistoryRow,
} from "./reports-web-document-delivery";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const aiExportProps = {
  aiExportRequest: {
    input: { type: "multi_action" as const, period: { id: "full_history" as const }, scope: { kind: "global" as const } },
    detailLevel: "default" as const,
    modules: { dataAndCartography: true, transparencyAndMethods: true, rawData: false, detailedFiles: true },
    theme: "impact" as const,
  },
  aiExportFallbackFilename: "cleanmymap-multi-action-rapport-ia.md",
  isAiExportDisabled: false,
};

const historyRows: ReportsWebDocumentHistoryRow[] = [
  {
    id: "report-1",
    report: "Rapport d'impact",
      period: "Six mois",
      perimeter: "Global",
    detail: "Par défaut (12 à 16 pages)",
    generatedAt: "01/08/2026 12:00",
  },
];

function createStatus(
  state: "idle" | "pending" | "success" | "error",
): ReportsWebDocumentExportStatus {
  if (state === "pending") {
    return {
      icon: Loader2,
      label: "Génération en cours",
      description: "Préparation du PDF en cours.",
      tone: "pending-tone",
      iconTone: "pending-icon-tone",
    };
  }

  if (state === "success") {
    return {
      icon: FileText,
      label: "Rapport généré",
      description: "Rapport imprimable ouvert.",
      tone: "success-tone",
      iconTone: "success-icon-tone",
    };
  }

  if (state === "error") {
    return {
      icon: TriangleAlert,
      label: "Erreur d’export",
      description: "Une erreur empêche l’export.",
      tone: "error-tone",
      iconTone: "error-icon-tone",
    };
  }

  return {
    icon: TriangleAlert,
    label: "Export indisponible",
    description: "Aucune donnée exploitable n'est disponible pour cette configuration.",
    tone: "idle-tone",
    iconTone: "idle-icon-tone",
  };
}

describe("ReportsWebDocumentDelivery", () => {
  it("keeps internal history controls private while preserving the delivery surface", () => {
    const controlsSource = readFileSync(new URL("./reports-history-action-controls.tsx", import.meta.url), "utf8");
    const deliverySource = readFileSync(new URL("./reports-web-document-delivery.tsx", import.meta.url), "utf8");

    expect(controlsSource).toContain("export function HistoryActionButtons");
    expect(controlsSource).toContain("export function HistoryActionFeedback");
    expect(controlsSource).not.toContain("export function HistoryActionPrimaryButtons");
    expect(controlsSource).not.toContain("export function HistoryPublicationFeedback");
    expect(deliverySource).not.toContain("export { HistoryActionButtons, HistoryActionFeedback }");
  });

  it.each([
    ["idle", "Export indisponible"],
    ["pending", "Génération en cours"],
    ["success", "Rapport généré"],
    ["error", "Erreur d’export"],
  ] as const)("preserves the %s export state", (state, label) => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsWebDocumentDelivery, {
        ...aiExportProps,
        state,
        message: state === "error" ? "Erreur de génération." : null,
        pendingLabel: "Génération en cours",
        isDisabled: state === "pending",
        exportStatus: createStatus(state),
        dailyExportAvailability: "available",
        historyWarning: null,
        onGenerate: vi.fn(),
      }),
    );

    expect(markup).toContain(label);
    expect(markup).toContain(
      `data-feedback-tone="${state === "error" ? "error" : state === "success" ? "success" : "info"}"`,
    );
    if (state === "error") {
      expect(markup).toContain("Erreur de génération.");
      expect(markup).toContain('role="alert"');
    }
    expect(markup).toContain("1 export détaillé par jour civil · Europe/Paris");
    expect(markup).toContain("Le brief Markdown pour IA reste indépendant de ce quota.");
    expect(markup).toContain("Exporter pour une IA");
    if (state !== "pending") expect(markup).toContain("Générer le PDF");
  });

  it("executes the export click and disables the control during a pending quota-bound run", async () => {
    const onGenerate = vi.fn();
    let renderer!: ReactTestRenderer;

    try {
      act(() => {
        renderer = create(React.createElement(ReportsWebDocumentDelivery, {
          ...aiExportProps,
          state: "idle",
          message: null,
          pendingLabel: "Génération en cours",
          isDisabled: false,
          exportStatus: createStatus("idle"),
          dailyExportAvailability: "available",
          historyWarning: null,
          onGenerate,
        }));
      });
      const button = renderer.root.findAllByType("button")[1];
      await act(() => button?.props.onClick());
      expect(onGenerate).toHaveBeenCalledTimes(1);

      act(() => {
        renderer.update(React.createElement(ReportsWebDocumentDelivery, {
          ...aiExportProps,
          state: "pending",
          message: null,
          pendingLabel: "Génération en cours",
          isDisabled: true,
          exportStatus: createStatus("pending"),
          dailyExportAvailability: "used",
          historyWarning: null,
          onGenerate,
        }));
      });
      expect(renderer.root.findAllByType("button")[1]?.props.disabled).toBe(true);
      expect(renderer.root.findAllByType("button")[0]?.props.disabled).toBe(false);
      expect(JSON.stringify(renderer.toJSON())).toContain("Déjà utilisé aujourd'hui");
    } finally {
      renderer?.unmount();
    }
  });

  it("renders persisted history fields with explicit replay actions", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsWebDocumentDeliveryHistory, {
        recentRows: historyRows,
        onView: vi.fn(),
        onReexport: vi.fn(),
      }),
    );

    expect(markup).toContain("Mes fichiers");
    expect(markup).toContain("Tous vos rapports générés et leurs métadonnées.");
    expect(markup).toContain("Rapport d&#x27;impact");
    expect(markup).toContain("Six mois");
    expect(markup).toContain("Global");
    expect(markup).toContain("Par défaut (12 à 16 pages)");
    expect(markup).toContain("01/08/2026 12:00");
    expect(markup).toContain("Actions");
    expect(markup).toContain("Voir");
    expect(markup).toContain("Télécharger PDF");
    expect(markup).toContain("Partager le PDF");
    expect(markup).toContain("Imprimer");
    expect(markup).toContain("Créer une nouvelle version");
    expect(markup).toContain("Copier la référence");
    expect(markup).toContain("Exporter JSON");
    expect(markup).toContain("Exporter CSV");
    expect(markup).not.toContain("Réexporter");
    expect(markup).toContain('min-h-11');
  });

  it("uses the canonical warning feedback for explicit publication confirmation", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsWebDocumentDeliveryHistory, {
        recentRows: historyRows,
        publicationPreviewById: {
          "report-1": {
            title: "Rapport d'impact",
            period: "Six mois",
            scope: "Global",
            theme: "impact",
            artifactReady: true,
            documentUrl: "/reports/report-1",
            communicatedContent: "Contenu prêt à publier.",
          },
        },
        onView: vi.fn(),
        onReexport: vi.fn(),
      }),
    );

    expect(markup).toContain('data-feedback-tone="warning"');
    expect(markup).toContain("Confirmer la publication");
    expect(markup).toContain("Contenu prêt à publier.");
  });

  it("renders the real empty state without synthetic rows", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsWebDocumentDeliveryHistory, {
        recentRows: [],
        onView: vi.fn(),
        onReexport: vi.fn(),
      }),
    );

    expect(markup).toContain("Aucun rapport généré");
    expect(markup).toContain('data-state-variant="empty"');
    expect(markup).not.toContain("Rapport d&#x27;impact");
  });

  it("distinguishes an unavailable history from a successful empty read", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsWebDocumentDeliveryHistory, {
        recentRows: [],
        historyAvailability: "unavailable",
        onView: vi.fn(),
        onReexport: vi.fn(),
      }),
    );

    expect(markup).toContain("Historique temporairement indisponible");
    expect(markup).toContain('data-feedback-tone="warning"');
    expect(markup).toContain('role="alert"');
    expect(markup).not.toContain("Aucun rapport généré");
  });
});

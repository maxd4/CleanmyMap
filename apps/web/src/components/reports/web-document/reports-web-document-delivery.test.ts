import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FileText, Loader2, TriangleAlert } from "lucide-react";
import {
  ReportsWebDocumentDelivery,
  ReportsWebDocumentDeliveryHistory,
  type ReportsWebDocumentExportStatus,
  type ReportsWebDocumentHistoryRow,
} from "./reports-web-document-delivery";

type TestElementProps = {
  children?: React.ReactNode;
  onClick?: (...args: unknown[]) => void;
  role?: string;
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

function collectDomElements(node: React.ReactNode): React.ReactElement<TestElementProps>[] {
  if (!React.isValidElement(node)) {
    return [];
  }

  const element = node as React.ReactElement<TestElementProps>;
  if (typeof element.type === "function") {
    const component = element.type as (props: TestElementProps) => React.ReactNode;
    return collectDomElements(component(element.props));
  }

  return [
    element,
    ...React.Children.toArray(element.props.children).flatMap(collectDomElements),
  ];
}

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
      description: "PDF ouvert.",
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
  it.each([
    ["idle", "Export indisponible"],
    ["pending", "Génération en cours"],
    ["success", "Rapport généré"],
    ["error", "Erreur d’export"],
  ] as const)("preserves the %s export state", (state, label) => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsWebDocumentDelivery, {
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
  });

  it("keeps the generation callback on the export action", () => {
    const onGenerate = vi.fn();
    const deliveryElements = collectDomElements(
      React.createElement(ReportsWebDocumentDelivery, {
        state: "idle",
        message: null,
        pendingLabel: "Génération en cours",
        isDisabled: false,
        exportStatus: createStatus("idle"),
        dailyExportAvailability: "available",
        historyWarning: null,
        onGenerate,
      }),
    );
    const deliveryButton = deliveryElements.find((element) => element.type === "button");
    deliveryButton?.props.onClick?.();

    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it("renders persisted history fields with explicit replay actions", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsWebDocumentDeliveryHistory, {
        recentRows: historyRows,
        onView: vi.fn(),
        onReexport: vi.fn(),
      }),
    );

    expect(markup).toContain("Rapports récents");
    expect(markup).toContain("Derniers rapports générés.");
    expect(markup).toContain("Rapport d&#x27;impact");
    expect(markup).toContain("Six mois");
    expect(markup).toContain("Global");
    expect(markup).toContain("Par défaut (12 à 16 pages)");
    expect(markup).toContain("01/08/2026 12:00");
    expect(markup).toContain("Actions");
    expect(markup).toContain("Voir");
    expect(markup).toContain("Réexporter");
    expect(markup).not.toContain("Télécharger");
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

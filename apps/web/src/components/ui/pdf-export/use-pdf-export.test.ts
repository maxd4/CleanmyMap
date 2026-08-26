import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { usePdfExport } from "./use-pdf-export";

const data = { title: "Rapport", summary: ["Résumé"] };

function renderHookApi(params: Parameters<typeof usePdfExport>[0]) {
  let result: ReturnType<typeof usePdfExport> | undefined;

  function Harness() {
    // This SSR-only harness exposes the hook result to the test caller.
    // eslint-disable-next-line react-hooks/globals
    result = usePdfExport(params);
    return null;
  }

  renderToStaticMarkup(React.createElement(Harness));
  return result;
}

describe("usePdfExport successful-generation contract", () => {
  it("notifies history only after the PDF generation callback succeeds", async () => {
    const onGenerate = vi.fn().mockResolvedValue(undefined);
    const onExportSuccess = vi.fn().mockResolvedValue(undefined);
    const api = renderHookApi({
      rubrique: "reporting",
      periode: "six_months",
      organizationType: "Global",
      defaultTitle: "Rapport",
      data,
      onGenerate,
      onExportSuccess,
    });

    await api?.exportRubriquePdf();

    expect(onGenerate).toHaveBeenCalledTimes(1);
    expect(onExportSuccess).toHaveBeenCalledTimes(1);
  });

  it("does not notify history when PDF generation fails", async () => {
    const onGenerate = vi.fn().mockRejectedValue(new Error("export failed"));
    const onExportSuccess = vi.fn();
    const api = renderHookApi({
      rubrique: "reporting",
      periode: "six_months",
      organizationType: "Global",
      defaultTitle: "Rapport",
      data,
      onGenerate,
      onExportSuccess,
    });

    await api?.exportRubriquePdf();

    expect(onExportSuccess).not.toHaveBeenCalled();
  });
});

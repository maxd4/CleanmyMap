import { beforeEach, describe, expect, it, vi } from "vitest";

const triggerBrowserDownloadMock = vi.hoisted(() => vi.fn());

vi.mock("@/components/reports/admin-workflow/services", () => ({
  triggerBrowserDownload: triggerBrowserDownloadMock,
}));

import { downloadHistoricalReportData, downloadOrShareReportPdf } from "./report-pdf-actions";

const fetchMock = vi.fn();

function pdfResponse(): Response {
  return new Response("%PDF-1.7", {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename*=UTF-8''rapport%20historique.pdf",
    },
  });
}

describe("downloadOrShareReportPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("navigator", {
      canShare: () => false,
      share: vi.fn(),
    });
  });

  it("shares the real PDF file when native file sharing is available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { canShare: () => true, share });
    fetchMock.mockResolvedValueOnce(pdfResponse());

    await expect(downloadOrShareReportPdf({
      generationId: "generation-1",
      theme: "scientific",
    })).resolves.toBe("shared");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reports/generations/generation-1/pdf?theme=scientific",
      { method: "GET", cache: "no-store" },
    );
    expect(share).toHaveBeenCalledWith(expect.objectContaining({
      files: [expect.any(File)],
    }));
    expect(triggerBrowserDownloadMock).not.toHaveBeenCalled();
  });

  it("falls back to the existing browser download primitive", async () => {
    fetchMock.mockResolvedValueOnce(pdfResponse());

    await expect(downloadOrShareReportPdf({
      generationId: "generation-1",
      theme: "impact",
    })).resolves.toBe("downloaded");

    expect(triggerBrowserDownloadMock).toHaveBeenCalledWith(
      expect.any(Blob),
      "rapport historique.pdf",
    );
  });

  it("rejects a non-PDF response instead of downloading HTML", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html />", {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }));

    await expect(downloadOrShareReportPdf({
      generationId: "generation-1",
      theme: "impact",
    })).rejects.toThrow("La réponse du téléchargement n’est pas un fichier PDF.");
    expect(triggerBrowserDownloadMock).not.toHaveBeenCalled();
  });
});

describe("downloadHistoricalReportData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("downloads the owner-scoped JSON response using the server filename", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": "attachment; filename=\"rapport.json\"",
      },
    }));

    await expect(downloadHistoricalReportData({ generationId: "generation-1", format: "json" })).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reports/generations/generation-1/json",
      { method: "GET", cache: "no-store" },
    );
    expect(triggerBrowserDownloadMock).toHaveBeenCalledWith(expect.any(Blob), "rapport.json");
  });

  it("rejects a wrong content type instead of downloading an HTML error page", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html />", {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }));

    await expect(downloadHistoricalReportData({ generationId: "generation-1", format: "csv" }))
      .rejects.toThrow("La réponse de l’export historique n’est pas dans le format demandé.");
    expect(triggerBrowserDownloadMock).not.toHaveBeenCalled();
  });
});

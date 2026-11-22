import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReportsWebDocumentHistorySharing } from "./reports-web-document-history-sharing";

const row = {
  id: "generation-current",
  report: "Rapport historique courant",
  period: "Six mois",
  perimeter: "Global",
  detail: "Par défaut",
  generatedAt: "22/11/2026 10:00",
};

const preview = {
  generationId: row.id,
  title: row.report,
  filename: "rapport.pdf",
  generatedAt: "2026-11-22T10:00:00.000Z",
  period: row.period,
  scope: row.perimeter,
  detailLevel: row.detail,
  theme: "scientific" as const,
  rendererVersion: "scientific-pdf-v1",
  artifactStatus: "ready",
  artifactReady: true,
  communicatedContent: "PDF uniquement",
};

const share = {
  id: "share-current",
  theme: "scientific" as const,
  rendererVersion: "scientific-pdf-v1",
  expiresAt: "2026-11-23T10:00:00.000Z",
  revokedAt: null,
  createdAt: "2026-11-22T10:00:00.000Z",
};

function button(renderer: ReactTestRenderer, label: string): ReactTestInstance {
  const found = renderer.root.findAll((node) =>
    node.type === "button" && node.children.join("") === label,
  )[0];
  if (!found) throw new Error(`Button not found: ${label}`);
  return found;
}

describe("report history sharing behavior", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows a newly created link and its revoked state from the server responses", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        preview,
        shares: [],
        expiryOptions: [3600, 86400, 604800],
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        share,
        shareUrl: "https://cleanmymap.test/api/reports/shared/test-bearer",
      }), { status: 201, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ revoked: true, shareId: share.id }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;

    try {
      act(() => {
        renderer = create(<ReportsWebDocumentHistorySharing row={row} theme="scientific" />);
      });

      await act(async () => {
        button(renderer, "Créer un lien de partage").props.onClick();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(renderer.root.findByProps({ role: "dialog" }).props["aria-label"]).toBe(`Partager ${row.report}`);
      expect(renderer.root.findAll((node) => node.children.includes("PDF uniquement"))).toHaveLength(1);

      await act(async () => {
        button(renderer, "Créer le lien").props.onClick();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(renderer.root.findByProps({ id: `report-share-url-${row.id}` }).props.value)
        .toBe("https://cleanmymap.test/api/reports/shared/test-bearer");
      expect(fetchMock.mock.calls.map(([url, init]) => [String(url), (init as RequestInit | undefined)?.method ?? "GET"])).toEqual([
        [`/api/reports/generations/${row.id}/share?theme=scientific`, "GET"],
        [`/api/reports/generations/${row.id}/share`, "POST"],
      ]);

      await act(async () => {
        button(renderer, "Révoquer").props.onClick();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(JSON.stringify(renderer.toJSON())).toContain("révoqué");
      expect(renderer.root.findAll((node) => node.type === "button" && node.children.join("") === "Révoquer")).toHaveLength(0);
      expect(fetchMock).toHaveBeenLastCalledWith(
        `/api/reports/generations/${row.id}/share/${share.id}`,
        { method: "DELETE" },
      );
    } finally {
      renderer?.unmount();
    }
  });
});

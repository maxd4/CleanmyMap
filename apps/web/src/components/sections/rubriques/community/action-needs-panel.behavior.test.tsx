import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionNeedsPanel } from "./action-needs-panel";
import type { ActionNeedItem } from "@/lib/community/needs-http";
import { jsonResponse as response, rendererText as text } from "@/__tests__/support/action-behavior-test-helpers";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis, window: globalThis });

const item: ActionNeedItem = {
  id: "need-1",
  actionId: "action-1",
  category: "materiel",
  title: "Gants",
  description: "Prévoir des gants.",
  quantityLabel: "10 paires",
  expiresAt: null,
  fulfilledAt: null,
  createdAt: "2098-12-01T00:00:00Z",
  updatedAt: "2098-12-01T00:00:00Z",
  status: "open",
  effectiveStatus: "open",
  canManage: true,
  action: { id: "action-1", title: "Action propre", actionDate: "2099-01-01", eventStartTime: null, locationLabel: "Paris" },
};

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => vi.unstubAllGlobals());

describe("ActionNeedsPanel behavior", () => {
  it("keeps public needs read-only and exposes manager transitions", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ status: "ok", items: [{ ...item, canManage: false }], managerActions: [] }))
      .mockResolvedValueOnce(response({ status: "updated", item }))
      .mockResolvedValueOnce(response({ status: "ok", items: [{ ...item, status: "fulfilled", effectiveStatus: "fulfilled" }], managerActions: [] }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("FormData", class {
      get(field: string) {
        return ({ category: "materiel", title: "Besoin modifié", description: "Description modifiée", quantityLabel: "5", expiresAt: "" } as Record<string, string>)[field] ?? null;
      }
    });
    let renderer!: ReactTestRenderer;
    act(() => { renderer = create(<ActionNeedsPanel fr focusActionId="action-1" />); });
    await act(async () => { await settle(); });
    expect(renderer.root.findAllByType("button").map((button) => button.props.children)).not.toContain("Accomplir");

    vi.mocked(fetch).mockReset();
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ status: "ok", items: [item], managerActions: [{ id: "action-1", title: "Action propre", actionDate: "2099-01-01" }] }))
      .mockResolvedValueOnce(response({ status: "updated", item }))
      .mockResolvedValueOnce(response({ status: "ok", items: [{ ...item, status: "fulfilled", effectiveStatus: "fulfilled" }], managerActions: [] }));
    act(() => { renderer.unmount(); });
    act(() => { renderer = create(<ActionNeedsPanel fr focusActionId="action-1" />); });
    await act(async () => { await settle(); });
    const fulfill = renderer.root.findAllByType("button").find((button) => button.props.children === "Accomplir");
    expect(fulfill).toBeDefined();
    await act(async () => { await fulfill?.props.onClick(); });
    expect(fetchMock).toHaveBeenCalledWith("/api/community/needs/need-1", expect.objectContaining({ method: "PATCH" }));
    expect(text(renderer)).toContain("Besoin mis à jour.");
  });

  it("creates and edits through the explicit service boundary, then reports network errors with retry", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ status: "ok", items: [item], managerActions: [{ id: "action-1", title: "Action propre", actionDate: "2099-01-01" }] }))
      .mockResolvedValueOnce(response({ status: "created", item }))
      .mockResolvedValueOnce(response({ status: "ok", items: [item], managerActions: [{ id: "action-1", title: "Action propre", actionDate: "2099-01-01" }] }))
      .mockRejectedValueOnce(new Error("service indisponible"))
      .mockResolvedValueOnce(response({ status: "ok", items: [item], managerActions: [] }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("FormData", class {
      get(field: string) {
        return ({ category: "materiel", title: "Besoin modifié", description: "Description modifiée", quantityLabel: "5", expiresAt: "" } as Record<string, string>)[field] ?? null;
      }
    });
    let renderer!: ReactTestRenderer;
    act(() => { renderer = create(<ActionNeedsPanel fr focusActionId={null} />); });
    await act(async () => { await settle(); });
    const inputs = renderer.root.findAllByType("input");
    const title = inputs.find((input) => input.props.required === true)!;
    await act(async () => { title.props.onChange({ target: { value: "Besoin urgent" } }); });
    const description = renderer.root.findAllByType("textarea")[0];
    await act(async () => { description.props.onChange({ target: { value: "Description suffisamment longue" } }); });
    const createButton = renderer.root.findAllByType("button").find((button) => button.props.children === "Créer le besoin");
    await act(async () => { await renderer.root.findByType("form").props.onSubmit({ preventDefault: vi.fn() }); });
    expect(fetchMock).toHaveBeenCalledWith("/api/community/needs", expect.objectContaining({ method: "POST" }));
    expect(createButton).toBeDefined();
    const edit = renderer.root.findAllByType("button").find((button) => button.props.children === "Modifier");
    await act(async () => { edit?.props.onClick(); });
    expect(text(renderer)).toContain("Modifier le besoin");
    await act(async () => { await renderer.root.findAllByType("form")[1].props.onSubmit({ preventDefault: vi.fn(), currentTarget: {} }); });
    expect(text(renderer)).toContain("Les besoins ne sont pas disponibles pour le moment.");
    const retry = renderer.root.findAllByType("button").find((button) => button.props.children === "Réessayer");
    await act(async () => { await retry?.props.onClick(); });
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("keeps expired needs terminal and hides management commands for public readers", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({
      status: "ok",
      items: [{ ...item, id: "expired", effectiveStatus: "expired", canManage: true, ownerUserId: "private-owner" }],
      managerActions: [],
    }));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    act(() => { renderer = create(<ActionNeedsPanel fr focusActionId={null} />); });
    await act(async () => { await settle(); });

    expect(text(renderer)).toContain("Expiré");
    expect(text(renderer)).not.toContain("private-owner");
    const commands = renderer.root.findAllByType("button").filter((button) =>
      ["Modifier", "Accomplir", "Annuler"].includes(button.props.children),
    );
    expect(commands).toHaveLength(3);
    expect(commands.every((button) => button.props.disabled === true)).toBe(true);
  });

  it("cancels a managed need and reloads the public projection", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ status: "ok", items: [item], managerActions: [{ id: "action-1", title: "Action propre", actionDate: "2099-01-01" }] }))
      .mockResolvedValueOnce(response({ status: "updated", item: { ...item, status: "cancelled", effectiveStatus: "cancelled" } }))
      .mockResolvedValueOnce(response({ status: "ok", items: [{ ...item, status: "cancelled", effectiveStatus: "cancelled" }], managerActions: [] }));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    act(() => { renderer = create(<ActionNeedsPanel fr focusActionId="action-1" />); });
    await act(async () => { await settle(); });

    const cancel = renderer.root.findAllByType("button").find((button) => button.props.children === "Annuler");
    await act(async () => { await cancel?.props.onClick(); });
    expect(fetchMock).toHaveBeenCalledWith("/api/community/needs/need-1", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ operation: "cancel" }),
    }));
    expect(text(renderer)).toContain("Besoin mis à jour.");
    expect(text(renderer)).toContain("Annulé");
  });

  it("recovers from an invalid public response through the retry action", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ status: "invalid", items: null, managerActions: null }))
      .mockResolvedValueOnce(response({ status: "ok", items: [], managerActions: [] }));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    act(() => { renderer = create(<ActionNeedsPanel fr focusActionId={null} />); });
    await act(async () => { await settle(); });
    expect(text(renderer)).toContain("La réponse des besoins est invalide.");

    const retry = renderer.root.findAllByType("button").find((button) => button.props.children === "Réessayer");
    await act(async () => { await retry?.props.onClick(); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(text(renderer)).toContain("Aucun besoin à afficher pour le moment.");
    expect(text(renderer)).not.toContain("La réponse des besoins est invalide.");
  });
});

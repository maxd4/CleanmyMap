import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OrganizerCombobox } from "./organizer-combobox";
import { jsonResponse as response } from "@/__tests__/support/action-behavior-test-helpers";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis, window: globalThis });

vi.mock("./organizer-combobox-suggestions", () => ({ useOrganizerSuggestions: () => [] }));

function props(node: ReactTestInstance) { return node.props as { onFocus?: () => void }; }
afterEach(() => vi.unstubAllGlobals());

describe("OrganizerCombobox behavior", () => {
  it("lets only an admin add a typed organizer and reports API errors", async () => {
    const onChange = vi.fn();
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ organizer: { id: "org-1", name: "Association" } }));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(<OrganizerCombobox id="organizer" organizerType="association" organizerId={null} value="" activeRole="admin" onChange={onChange} />); });
    const input = renderer.root.findByProps({ role: "combobox" });
    await act(async () => { props(input).onFocus?.(); });
    const add = renderer.root.findAllByType("button").find((button) => button.props.children === "+ Ajouter");
    expect(add).toBeDefined();
    await act(async () => { add?.props.onClick(); });
    const nameInput = renderer.root.findAllByType("input").find((candidate) => String(candidate.props.id).endsWith("-new-organizer"));
    await act(async () => { nameInput?.props.onChange({ target: { value: "Association" } }); });
    const submit = renderer.root.findAllByType("button").find((button) => button.props.children === "Ajouter");
    await act(async () => { await submit?.props.onClick(); });
    expect(onChange).toHaveBeenCalledWith({ id: "org-1", name: "Association" });
    expect(fetchMock).toHaveBeenCalledWith("/api/actions/organizers", expect.objectContaining({ method: "POST" }));

    let forbidden!: ReactTestRenderer;
    await act(async () => { forbidden = create(<OrganizerCombobox id="organizer-2" organizerType="association" organizerId={null} value="" activeRole="benevole" onChange={vi.fn()} />); });
    await act(async () => { forbidden.root.findByProps({ role: "combobox" }).props.onFocus(); });
    expect(forbidden.root.findAllByType("button").some((button) => button.props.children === "+ Ajouter")).toBe(false);
  });

  it("keeps failed organizer creation visible to the user", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ error: "Droit insuffisant" }, 403));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(<OrganizerCombobox id="organizer" organizerType="association" organizerId={null} value="" activeRole="max" onChange={vi.fn()} />); });
    await act(async () => { renderer.root.findByProps({ role: "combobox" }).props.onFocus(); });
    await act(async () => { renderer.root.findAllByType("button").find((button) => button.props.children === "+ Ajouter")?.props.onClick(); });
    const nameInput = renderer.root.findAllByType("input").find((candidate) => String(candidate.props.id).endsWith("-new-organizer"));
    await act(async () => { nameInput?.props.onChange({ target: { value: "Association" } }); });
    await act(async () => { await renderer.root.findAllByType("button").find((button) => button.props.children === "Ajouter")?.props.onClick(); });
    expect(renderer.root.findAll((node) => node.children.includes("Droit insuffisant")).length).toBeGreaterThan(0);
  });
});

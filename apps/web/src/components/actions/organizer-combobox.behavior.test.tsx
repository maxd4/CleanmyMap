import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OrganizerCombobox } from "./organizer-combobox";
import { jsonResponse as response } from "@/__tests__/support/action-behavior-test-helpers";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis, window: globalThis });

vi.mock("./organizer-combobox-suggestions", () => ({ useOrganizerSuggestions: () => [{ id: "directory-company", name: "Entreprise Référencée", organizerType: "company", source: "canonical" }] }));

function props(node: ReactTestInstance) { return node.props as { onFocus?: () => void }; }
afterEach(() => vi.unstubAllGlobals());

describe("OrganizerCombobox behavior", () => {
  it("offers an explicit free declaration and clears it when the text changes", async () => {
    const onChange = vi.fn();
    let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(<OrganizerCombobox id="organizer-free" organizerType="company" organizerId={null} value="" activeRole="benevole" onChange={onChange} />); });
    const input = renderer.root.findByProps({ role: "combobox" });
    await act(async () => { input.props.onChange({ target: { value: "Entreprise locale" } }); });
    await act(async () => { renderer.update(<OrganizerCombobox id="organizer-free" organizerType="company" organizerId={null} value="Entreprise locale" activeRole="benevole" onChange={onChange} />); });
    const declaration = renderer.root.findAllByType("button").find((button) => button.props.role === "option" && String(button.props.id).endsWith("option-0"));
    expect(declaration).toBeDefined();
    await act(async () => { declaration?.props.onClick(); });
    expect(onChange).toHaveBeenLastCalledWith({ id: null, name: "Entreprise locale", referenceStatus: "declared_unreferenced" });

    await act(async () => { input.props.onChange({ target: { value: "Entreprise changée" } }); });
    await act(async () => { renderer.update(<OrganizerCombobox id="organizer-free" organizerType="company" organizerId={null} value="Entreprise changée" activeRole="benevole" onChange={onChange} />); });
    expect(onChange).toHaveBeenLastCalledWith({ id: null, name: "Entreprise changée", referenceStatus: null });
    expect(renderer.root.findAllByType("button").some((button) => button.props.children === "+ Ajouter")).toBe(false);
    renderer.unmount();
  });

  it("keeps a selected suggestion referenced and does not offer a duplicate declaration", async () => {
    const onChange = vi.fn();
    let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(<OrganizerCombobox id="organizer-ref" organizerType="company" organizerId={null} value="Entreprise Référencée" activeRole="benevole" onChange={onChange} />); });
    await act(async () => { renderer.root.findByProps({ role: "combobox" }).props.onFocus(); });
    const options = renderer.root.findAll((node) => node.props.role === "option");
    expect(options).toHaveLength(1);
    await act(async () => { options[0]?.props.onClick(); });
    expect(onChange).toHaveBeenLastCalledWith({ id: "directory-company", name: "Entreprise Référencée", referenceStatus: "referenced" });
    renderer.unmount();
  });

  it("keeps an absent spontaneous pseudo as a label with no account identifier", async () => {
    const onChange = vi.fn();
    let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(<OrganizerCombobox id="spontaneous" organizerType="spontaneous" organizerId={null} value="" organizerAccountIds={[]} onChange={onChange} />); });
    const input = renderer.root.findByProps({ id: "spontaneous-declared-name" });
    await act(async () => { input.props.onChange({ target: { value: "Pseudo de terrain" } }); });
    expect(onChange).toHaveBeenLastCalledWith({ id: null, name: "Pseudo de terrain", accountIds: [], referenceStatus: "declared_unreferenced" });
    await act(async () => { renderer.update(<OrganizerCombobox id="spontaneous" organizerType="spontaneous" organizerId={null} value="Pseudo de terrain" organizerAccountIds={[]} onChange={onChange} />); });
    expect(renderer.root.findAllByType("input").some((candidate) => candidate.props.value === "Pseudo de terrain")).toBe(true);
    renderer.unmount();
  });

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
    expect(onChange).toHaveBeenCalledWith({ id: "org-1", name: "Association", referenceStatus: "referenced" });
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

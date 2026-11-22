import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { ActionAddressAutocomplete } from "./action-address-autocomplete";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis, window: globalThis });

describe("ActionAddressAutocomplete free address behavior", () => {
  it("confirms typed text as an address without coordinates by mouse or keyboard", async () => {
    const onChange = vi.fn();
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<ActionAddressAutocomplete id="address" label="Adresse" placeholder="Adresse" value="" onChange={onChange} helperText="Suggestions" />);
    });
    const input = renderer.root.findByProps({ role: "combobox" });
    await act(async () => { input.props.onChange({ target: { value: "Lieu non répertorié" } }); });
    await act(async () => {
      renderer.update(<ActionAddressAutocomplete id="address" label="Adresse" placeholder="Adresse" value="Lieu non répertorié" onChange={onChange} helperText="Suggestions" />);
    });
    const freeOption = renderer.root.findAllByType("button").find((button) => button.props.id?.endsWith("option-0"));
    expect(freeOption).toBeDefined();
    expect(renderer.root.findAll((node) => node.type === "p" && node.children.includes("Adresse sans coordonnées")).length).toBe(1);
    await act(async () => { input.props.onKeyDown({ key: "Enter", preventDefault: vi.fn() }); });
    expect(onChange).toHaveBeenLastCalledWith("Lieu non répertorié", null);
    renderer.unmount();
  });
});

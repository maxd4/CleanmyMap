import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it } from "vitest";
import { ORGANIZER_TYPE_VALUES, type OrganizerType } from "@/lib/actions/organizer-type";
import { ActionOrganizerTypeChoices } from "./action-organizer-type-choices";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("ActionOrganizerTypeChoices", () => {
  it("provides eight exclusive native radios in a responsive group and supports every path change", () => {
    let value: OrganizerType | "" = "";
    let renderer!: ReactTestRenderer;
    const render = () => (
      <ActionOrganizerTypeChoices
        value={value}
        required
        invalid={false}
        onChange={(next) => { value = next; renderAgain(); }}
      />
    );
    const renderAgain = () => renderer.update(render());
    act(() => { renderer = create(render()); });

    for (const organizerType of ORGANIZER_TYPE_VALUES) {
      const radios = renderer.root.findAll((node) => node.type === "input" && node.props.type === "radio");
      expect(radios).toHaveLength(8);
      expect(radios.every((radio) => radio.props.name === "action-organizer-type")).toBe(true);
      const selected = radios.find((radio) => radio.props.value === organizerType);
      expect(selected).toBeDefined();
      act(() => selected?.props.onChange());
      expect(value).toBe(organizerType);
      expect(renderer.root.findAll((node) => node.type === "input" && node.props.checked)).toHaveLength(1);
    }

    expect(JSON.stringify(renderer.toJSON())).toContain("sm:grid-cols-4");
    act(() => renderer.unmount());
  });
});

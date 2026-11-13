import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { ActionSearchCountryField } from "./action-search-country-field";

describe("ActionSearchCountryField", () => {
  it("starts from the profile country while exposing the requested international countries", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ActionSearchCountryField countryCode="FR" onChange={vi.fn()} />);
    });
    const select = renderer.root.findByType("select");
    const optionValues = select.findAllByType("option").map((option) => option.props.value);

    expect(select.props.value).toBe("FR");
    expect(optionValues).toEqual(expect.arrayContaining(["BE", "CH", "CA", "SN"]));
  });

  it("changes only the local search scope", () => {
    const onChange = vi.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ActionSearchCountryField countryCode="FR" onChange={onChange} />);
    });
    const select = renderer.root.findByType("select");

    act(() => select.props.onChange({ target: { value: "BE" } }));

    expect(onChange).toHaveBeenCalledWith("BE");
  });
});

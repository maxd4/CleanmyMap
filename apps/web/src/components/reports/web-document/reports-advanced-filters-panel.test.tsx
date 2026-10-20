import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { ReportsAdvancedFiltersPanel } from "./reports-advanced-filters-panel";
import { REPORT_ADVANCED_FILTER_DEFAULTS } from "./reports-web-document.shared";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("ReportsAdvancedFiltersPanel interactions", () => {
  it("emits canonical filter changes from real select and numeric input events", () => {
    const onChange = vi.fn();
    let renderer!: ReactTestRenderer;

    try {
      act(() => {
        renderer = create(
          <ReportsAdvancedFiltersPanel
            filters={REPORT_ADVANCED_FILTER_DEFAULTS}
            onChange={onChange}
            actionMediaAvailability="available"
          />,
        );
      });

      const selects = renderer.root.findAllByType("select");
      const inputs = renderer.root.findAllByType("input");
      act(() => {
        selects[0]?.props.onChange({ target: { value: "without_blocking_anomaly" } });
        selects[2]?.props.onChange({ target: { value: "derived" } });
        selects[4]?.props.onChange({ target: { value: "reconstructed" } });
        selects[6]?.props.onChange({ target: { value: "recyclables" } });
        selects[8]?.props.onChange({ target: { value: "with" } });
        inputs[0]?.props.onChange({ target: { value: "0" } });
        inputs[1]?.props.onChange({ target: { value: "12.5" } });
      });

      expect(onChange.mock.calls.map(([value]) => value)).toEqual([
        { ...REPORT_ADVANCED_FILTER_DEFAULTS, dataQuality: "without_blocking_anomaly" },
        { ...REPORT_ADVANCED_FILTER_DEFAULTS, measureProvenance: "derived" },
        { ...REPORT_ADVANCED_FILTER_DEFAULTS, geometryProvenance: "reconstructed" },
        { ...REPORT_ADVANCED_FILTER_DEFAULTS, wasteCategory: "recyclables" },
        { ...REPORT_ADVANCED_FILTER_DEFAULTS, photographicEvidence: "with" },
        { ...REPORT_ADVANCED_FILTER_DEFAULTS, wasteKgMin: 0 },
        { ...REPORT_ADVANCED_FILTER_DEFAULTS, wasteKgMax: 12.5 },
      ]);
    } finally {
      renderer?.unmount();
    }
  });

  it("disables photo filtering and explains unavailable media without changing the filter", () => {
    const onChange = vi.fn();
    let renderer!: ReactTestRenderer;

    try {
      act(() => {
        renderer = create(
          <ReportsAdvancedFiltersPanel
            filters={{ ...REPORT_ADVANCED_FILTER_DEFAULTS, photographicEvidence: "any" }}
            onChange={onChange}
            actionMediaAvailability="unavailable"
          />,
        );
      });

      const selects = renderer.root.findAllByType("select");
      const photoFilter = selects.at(-1);
      expect(photoFilter?.props.disabled).toBe(true);
      expect(renderer.root.findAllByType("span").some((node) => node.children.join(" ").includes("Preuve photo indisponible"))).toBe(true);
      expect(onChange).not.toHaveBeenCalled();
    } finally {
      renderer?.unmount();
    }
  });
});

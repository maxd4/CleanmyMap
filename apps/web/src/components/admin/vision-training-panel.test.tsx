import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VisionTrainingPanel } from "./vision-training-panel";

const emptyMetrics = {
  count: 0,
  labelledCount: 0,
  mae: null,
  rmse: null,
  latestModelVersion: null,
  paused: true,
  statusCounts: {
    pending_label: 0,
    labelled: 0,
    needs_review: 0,
    no_photo: 0,
  },
} as const;

describe("VisionTrainingPanel", () => {
  it("renders the paused empty state with n/a comparable metrics", () => {
    const markup = renderToStaticMarkup(<VisionTrainingPanel metrics={emptyMetrics} />);

    expect(markup).toContain("Entraînement vision");
    expect(markup).toContain("En pause");
    expect(markup).toContain("Aucun exemple d’entraînement disponible.");
    expect(markup).toContain(">n/a<");
    expect(markup).not.toContain("Dataset suffisant");
  });

  it("renders active data and status counts", () => {
    const markup = renderToStaticMarkup(
      <VisionTrainingPanel
        metrics={{
          ...emptyMetrics,
          count: 4,
          labelledCount: 2,
          mae: 1.25,
          rmse: 1.5,
          latestModelVersion: "vision-v2",
          paused: false,
          statusCounts: {
            pending_label: 1,
            labelled: 2,
            needs_review: 1,
            no_photo: 0,
          },
        }}
      />,
    );

    expect(markup).toContain("Actif");
    expect(markup).toContain("vision-v2");
    expect(markup).toContain("1.25");
    expect(markup).toContain("needs_review");
    expect(markup).not.toContain("Aucun exemple d’entraînement disponible.");
  });
});

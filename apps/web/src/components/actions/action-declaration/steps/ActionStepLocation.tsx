"use client";

import { ActionLocationGeometryPanel } from "../action-location-geometry-panel";
import { ActionLocationInputs } from "../action-location-inputs";
import type { ActionStepLocationProps } from "../action-location.types";

export type { ActionStepLocationProps } from "../action-location.types";

export function ActionStepLocation({
  mode = "all",
  ...props
}: ActionStepLocationProps) {
  if (mode === "primary") {
    return <ActionLocationInputs {...props} mode={mode} />;
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <ActionLocationInputs {...props} mode={mode} />
      <ActionLocationGeometryPanel {...props} />
    </div>
  );
}

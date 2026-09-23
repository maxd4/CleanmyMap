import type {
  EnvironmentalImpactEstimateModel,
  EnvironmentalImpactSnapshotRecord,
} from "@/lib/environmental-impact-estimator/types";
import {
  LifecycleSection,
  SecondOrderSection,
  WaterSection,
} from "./environmental-impact-estimator-panel-details-environment";
import {
  InfrastructureServicesSection,
  InfrastructureUsageSummary,
} from "./environmental-impact-estimator-panel-details-infrastructure";
import {
  MethodologyAndLimitations,
  ScopePostDetails,
  SnapshotHistory,
} from "./environmental-impact-estimator-panel-details-audit";

type EnvironmentalImpactEstimatorPanelDetailsProps = {
  model: EnvironmentalImpactEstimateModel;
  snapshots: EnvironmentalImpactSnapshotRecord[];
};

export function EnvironmentalImpactEstimatorPanelDetails({
  model,
  snapshots,
}: EnvironmentalImpactEstimatorPanelDetailsProps) {
  return (
    <>
      <SecondOrderSection model={model} />
      <WaterSection model={model} />
      <LifecycleSection model={model} />
      <InfrastructureServicesSection model={model} />
      <InfrastructureUsageSummary model={model} />
      <ScopePostDetails model={model} snapshots={snapshots} />
      <MethodologyAndLimitations model={model} snapshots={snapshots} />
      <SnapshotHistory model={model} snapshots={snapshots} />
    </>
  );
}

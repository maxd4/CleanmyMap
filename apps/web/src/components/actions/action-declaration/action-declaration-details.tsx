"use client";

import type { ComponentProps } from "react";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { ActionFormDisclosureSummary } from "./action-form-disclosure-summary";
import { ActionStepHarvest } from "./steps/ActionStepHarvest";
import { ActionStepIdentity } from "./steps/ActionStepIdentity";
import { ActionStepLocation } from "./steps/ActionStepLocation";

type IdentityProps = Omit<ComponentProps<typeof ActionStepIdentity>, "mode">;
type HarvestProps = Omit<ComponentProps<typeof ActionStepHarvest>, "mode">;
type LocationProps = Omit<ComponentProps<typeof ActionStepLocation>, "mode">;

type DisclosureState = {
  open: boolean;
  onToggle: (open: boolean) => void;
};

export type ActionDeclarationDetailsProps = {
  identity: IdentityProps;
  harvest: HarvestProps;
  location: LocationProps;
  summaries: {
    organization: string;
    collection: string | undefined;
    photo: string | undefined;
    route: string | undefined;
    time: string | undefined;
  };
  disclosures: {
    organization: DisclosureState;
    collection: DisclosureState;
    photo: DisclosureState;
    route: DisclosureState;
    time: DisclosureState;
  };
};

export function ActionDeclarationDetails({
  identity,
  harvest,
  location,
  summaries,
  disclosures,
}: ActionDeclarationDetailsProps) {
  return (
    <div className="space-y-3">
      <CmmDisclosure
        id="action-disclosure-organization"
        summary={<ActionFormDisclosureSummary label="Détails de l’organisation" detail={summaries.organization} />}
        tone="emerald"
        size="md"
        open={disclosures.organization.open}
        onToggle={disclosures.organization.onToggle}
      >
        {disclosures.organization.open ? <ActionStepIdentity {...identity} mode="organization" /> : null}
      </CmmDisclosure>

      <CmmDisclosure
        id="action-disclosure-collection"
        summary={<ActionFormDisclosureSummary label="Détails de la collecte" detail={summaries.collection} />}
        tone="emerald"
        size="md"
        open={disclosures.collection.open}
        onToggle={disclosures.collection.onToggle}
      >
        {disclosures.collection.open ? (
          <div className="space-y-5">
            <ActionStepIdentity {...identity} mode="collection" />
            <ActionStepHarvest {...harvest} mode="collection" />
          </div>
        ) : null}
      </CmmDisclosure>

      <CmmDisclosure
        id="action-disclosure-photos"
        summary={<ActionFormDisclosureSummary label="Photos et estimation" detail={summaries.photo} />}
        tone="emerald"
        size="md"
        open={disclosures.photo.open}
        onToggle={disclosures.photo.onToggle}
      >
        {disclosures.photo.open ? <ActionStepHarvest {...harvest} mode="photos" /> : null}
      </CmmDisclosure>

      <CmmDisclosure
        id="action-disclosure-route"
        summary={<ActionFormDisclosureSummary label="Parcours et géométrie" detail={summaries.route} />}
        tone="emerald"
        size="md"
        open={disclosures.route.open}
        onToggle={disclosures.route.onToggle}
      >
        {disclosures.route.open ? <ActionStepLocation {...location} mode="details" /> : null}
      </CmmDisclosure>

      <CmmDisclosure
        id="action-disclosure-time"
        summary={<ActionFormDisclosureSummary label="Détails temporels" detail={summaries.time} />}
        tone="emerald"
        size="md"
        open={disclosures.time.open}
        onToggle={disclosures.time.onToggle}
      >
        {disclosures.time.open ? <ActionStepIdentity {...identity} mode="time" /> : null}
      </CmmDisclosure>
    </div>
  );
}

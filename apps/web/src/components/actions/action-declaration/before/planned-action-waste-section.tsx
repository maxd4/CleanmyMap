import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { WasteCategorySelector, WasteFieldSummary } from "@/components/waste/waste-category-selector";
import { ActionFormDisclosureSummary } from "../action-form-disclosure-summary";
import type { BaseSectionProps } from "./section-contract";

export function ExpectedWasteSection({ form, updateField }: BaseSectionProps) {
  return (
    <CmmDisclosure summary={<ActionFormDisclosureSummary label="Déchets attendus" detail={form.wasteCategories?.length ? `${form.wasteCategories.length} catégorie${form.wasteCategories.length > 1 ? "s" : ""}` : undefined} />} tone="emerald" size="md">
      <div className="space-y-4">
        <p className="text-sm leading-5 text-emerald-900/70">Sélection facultative de catégories susceptibles d’être rencontrées pendant l’action. Il s’agit d’une prévision, distincte des déchets réellement collectés ; les consignes dérivées du référentiel s’affichent après sélection.</p>
        <WasteCategorySelector value={form.wasteCategories ?? []} onChange={(value) => updateField("wasteCategories", value)} idPrefix="expected-waste" />
        <WasteFieldSummary value={form.wasteCategories ?? []} />
      </div>
    </CmmDisclosure>
  );
}

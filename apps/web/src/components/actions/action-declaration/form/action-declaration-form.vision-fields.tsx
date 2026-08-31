import type { FormState } from "./model";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { CmmField, CmmInput } from "@/components/ui/cmm-field";

type ActionDeclarationVisionFieldsProps = {
 form: FormState;
 onVisionBagsCountChange: (value: string) => void;
 onVisionFillLevelChange: (value: string) => void;
 onVisionDensityChange: (value: string) => void;
};

export function ActionDeclarationVisionFields({
 form,
 onVisionBagsCountChange,
 onVisionFillLevelChange,
 onVisionDensityChange,
}: ActionDeclarationVisionFieldsProps) {
 return (
 <CmmDisclosure
   className="mt-4"
   tone="emerald"
   summary="Précisions IA (optionnel)"
 >
 <div className="mt-4 grid gap-3 md:grid-cols-3">
 <CmmField label="Nombre de sacs">
 <CmmInput
 type="number"
 min="0"
 step="1"
 value={form.visionBagsCount}
 onChange={(event) => onVisionBagsCountChange(event.target.value)}
 placeholder="Ex: 3"
 />
 </CmmField>

 <CmmField label="Taux de remplissage (%)">
 <CmmInput
 type="number"
 min="0"
 max="100"
 step="1"
 value={form.visionFillLevel}
 onChange={(event) => onVisionFillLevelChange(event.target.value)}
 placeholder="Ex: 80"
 />
 </CmmField>

 <CmmField label="Densité (kg/L)">
 <CmmInput
 type="number"
 min="0"
 step="0.01"
 value={form.visionDensity}
 onChange={(event) => onVisionDensityChange(event.target.value)}
 placeholder="Ex: 0.15"
 />
 </CmmField>
 </div>
 </CmmDisclosure>
 );
}

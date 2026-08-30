import type { FormState } from"./model";
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
 <details className="mt-4 rounded-xl border border-emerald-200 bg-white px-4 py-3">
 <summary className="cursor-pointer list-none cmm-text-small font-semibold text-emerald-950">
 Précisions IA (optionnel)
 </summary>
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
 </details>
 );
}

import type {
  ActionDeclarationExportBundle,
  ActionDeclarationExportBundleId,
} from "@/lib/actions/exports/export-form-media";
import { cn } from "@/lib/utils";

type ActionDeclarationExportPickerBundleSelectionProps = {
  orderedBundles: ActionDeclarationExportBundle[];
  activeBundle: ActionDeclarationExportBundle;
  onSelectBundle: (bundleId: ActionDeclarationExportBundleId) => void;
};

export function ActionDeclarationExportPickerBundleSelection({
  orderedBundles,
  activeBundle,
  onSelectBundle,
}: ActionDeclarationExportPickerBundleSelectionProps) {
  return (
    <div className="-mx-1 flex snap-x flex-nowrap gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {orderedBundles.map((bundle) => {
        const isActive = bundle.id === activeBundle.id;

        return (
          <button
            key={bundle.id}
            type="button"
            onClick={() => onSelectBundle(bundle.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] transition",
              isActive
                ? "border-emerald-500 bg-emerald-600 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            {bundle.label}
          </button>
        );
      })}
    </div>
  );
}

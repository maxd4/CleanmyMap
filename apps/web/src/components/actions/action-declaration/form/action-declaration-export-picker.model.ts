import type {
  ActionDeclarationExportBundle,
  ActionDeclarationExportBundleId,
  ActionDeclarationExportTarget,
} from "@/lib/actions/exports/export-form-media";

export function getTargetTone(target: ActionDeclarationExportTarget): string {
  switch (target.id) {
    case "pdf":
      return "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50";
    case "png":
      return "border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-300 hover:bg-emerald-100";
    case "story-instagram":
      return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-950 hover:border-fuchsia-300 hover:bg-fuchsia-100";
    case "publication-facebook":
      return "border-blue-200 bg-blue-50 text-blue-950 hover:border-blue-300 hover:bg-blue-100";
    case "publication-x":
      return "border-slate-200 bg-slate-50 text-slate-950 hover:border-slate-300 hover:bg-slate-100";
    default:
      return "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50";
  }
}

export function getSelectedTargetLabel(target: ActionDeclarationExportTarget): string {
  return target.id === "pdf" ? "A4 imprimable" : `${target.width} × ${target.height}`;
}

export function getDefaultBundleId(isCompactViewport: boolean): ActionDeclarationExportBundleId {
  return isCompactViewport ? "social" : "terrain";
}

export function getDefaultTargetId(isCompactViewport: boolean): ActionDeclarationExportTarget["id"] {
  return isCompactViewport ? "story-instagram" : "pdf";
}

export function getOrderedActionDeclarationExportBundles(
  bundles: ActionDeclarationExportBundle[],
  isCompactViewport: boolean,
): ActionDeclarationExportBundle[] {
  const preferredOrder: ActionDeclarationExportBundleId[] = isCompactViewport
    ? ["social", "terrain", "institutionnel", "rapport"]
    : ["terrain", "rapport", "institutionnel", "social"];

  return preferredOrder
    .map((bundleId) => bundles.find((bundle) => bundle.id === bundleId))
    .filter((bundle): bundle is ActionDeclarationExportBundle => Boolean(bundle));
}

export function getOrderedActionDeclarationExportTargets(
  targets: ActionDeclarationExportTarget[],
  activeBundle: Pick<ActionDeclarationExportBundle, "targetIds">,
): ActionDeclarationExportTarget[] {
  const recommendedIds = new Set(activeBundle.targetIds);
  const preferred = activeBundle.targetIds
    .map((id) => targets.find((target) => target.id === id))
    .filter((target): target is ActionDeclarationExportTarget => Boolean(target));
  const others = targets.filter((target) => !recommendedIds.has(target.id));

  return [...preferred, ...others];
}

export function resolveActionDeclarationExportTarget(
  orderedTargets: ActionDeclarationExportTarget[],
  selectedTargetId: ActionDeclarationExportTarget["id"],
  targets: ActionDeclarationExportTarget[],
): ActionDeclarationExportTarget | undefined {
  return orderedTargets.find((target) => target.id === selectedTargetId) ?? orderedTargets[0] ?? targets[0];
}

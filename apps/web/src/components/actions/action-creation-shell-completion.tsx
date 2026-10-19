import { ActionDeclarationForm } from "./action-declaration/form";
import { ActionLifecycleNavigation } from "./action-creation-shell-navigation";
import { CmmCard } from "@/components/ui/cmm-card";
import { ActionRoleAttestationsPanel } from "@/components/actions/action-role-attestations-panel";
import type { ActionCreationSectionFormProps } from "./action-creation-shell.types";

type SearchParams = Record<string, string | string[] | undefined>;

export function AfterActionCreationView({
  formProps,
  actionId,
  searchParams,
  fr,
}: {
  formProps: ActionCreationSectionFormProps;
  actionId: string | null;
  searchParams?: SearchParams;
  fr: boolean;
}) {
  return <div data-testid="action-creation-shell" className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#ECF8EF] via-white to-[#F7FCF8] px-3 py-4 md:px-5 md:py-6"><div className="cmm-page-width space-y-4"><CmmCard tone="emerald" variant="glass" size="lg"><h1 className="text-[clamp(2rem,4vw,3.4rem)] font-black tracking-tight text-emerald-950">Bilan d’une action réalisée</h1></CmmCard><ActionLifecycleNavigation actionId={actionId} activeSpace="bilan" fr={fr} searchParams={searchParams} /><div role="tabpanel" aria-labelledby={actionId ? "action-creation-space-bilan" : "action-creation-tab-after"}><ActionDeclarationForm {...formProps} initialActionId={actionId} /></div></div></div>;
}
export function ActionBilanView({
  formProps,
  actionId,
  searchParams,
  fr,
}: {
  formProps: ActionCreationSectionFormProps;
  actionId: string;
  searchParams?: SearchParams;
  fr: boolean;
}) {
  return <div data-testid="action-bilan-view" className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#ECF8EF] via-white to-[#F7FCF8] px-3 py-4 md:px-5 md:py-6"><div className="cmm-page-width space-y-4"><CmmCard tone="emerald" variant="glass" size="lg"><div className="space-y-2"><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Bilan</p><h1 className="text-[clamp(2rem,4vw,3.4rem)] font-black tracking-tight text-emerald-950">Finaliser la même action</h1><p className="cmm-text-body cmm-text-primary">Les photos, mesures, présences confirmées et règles de validation restent ceux du formulaire final existant.</p></div></CmmCard><ActionLifecycleNavigation actionId={actionId} activeSpace="bilan" fr={fr} searchParams={searchParams} /><ActionRoleAttestationsPanel actionId={actionId} /><div role="tabpanel" aria-labelledby="action-creation-space-bilan"><ActionDeclarationForm {...formProps} initialActionId={actionId} /></div></div></div>;
}

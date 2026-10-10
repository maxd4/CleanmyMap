import { ArrowRight, Plus } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";

type DashboardPriorityActionProps = {
  locale: "fr" | "en";
};

export function DashboardPriorityAction({ locale }: DashboardPriorityActionProps) {
  return (
    <div
      data-gsap-reveal
      className="relative overflow-hidden rounded-3xl"
    >
      <div className="pointer-events-none absolute inset-0 rounded-3xl border border-amber-200/18 bg-[linear-gradient(145deg,rgba(44,28,15,0.78)_0%,rgba(92,45,12,0.84)_56%,rgba(245,158,11,0.26)_100%)] shadow-[0_22px_54px_-34px_rgba(124,45,18,0.30)]" />
      <div className="relative z-10 flex flex-col gap-5 px-7 py-7 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <p className="cmm-text-caption font-bold uppercase tracking-[0.3em] text-amber-100">
            {locale === "fr" ? "Action prioritaire" : "Priority action"}
          </p>
          <h2 className="text-2xl font-black tracking-tight text-white">
            {locale === "fr" ? "Créer une action" : "Create an action"}
          </h2>
          <p className="text-base font-medium text-white max-w-md leading-relaxed">
            {locale === "fr"
              ? "Enregistrez une intervention terrain depuis le formulaire dédié."
              : "Log a field intervention from the dedicated form."}
          </p>
        </div>
        <CmmButton
          href="/actions/new"
          tone="primary"
          variant="pill"
          size="lg"
          className="group h-14 px-7 text-[14px] font-black shadow-[0_8px_32px_-8px_rgba(0,0,0,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.4)]"
        >
          <Plus size={18} />
          {locale === "fr" ? "Ouvrir le formulaire" : "Open the form"}
          <ArrowRight
            size={15}
            className="ml-1 transition-transform group-hover:translate-x-1"
          />
        </CmmButton>
      </div>
    </div>
  );
}

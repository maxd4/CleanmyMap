import { PartnerOnboardingForm } from "@/components/partners/partner-onboarding-form";

export default function PartnerOnboardingPage() {
  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          Onboarding commerçant engagé
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Parcours en quelques minutes pour rejoindre le réseau. Votre demande est
          envoyée aux admins pour validation.
        </p>
      </header>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <PartnerOnboardingForm />
      </div>
    </div>
  );
}

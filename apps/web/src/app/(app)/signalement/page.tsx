import { QuickSignalementForm } from "@/components/actions/quick-signalement-form";
import { DecisionPageHeader } from "@/components/ui/decision-page-header";

export default function SignalementPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <DecisionPageHeader
        context="Terrain"
        title="Signalement Express"
        objective="Signaler une zone polluée en 10 secondes. GPS et Photo recommandés."
      />
      
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-8">
        <QuickSignalementForm />
      </div>

      <footer className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest py-4">
        Donnée géolocalisée temps réel
      </footer>
    </div>
  );
}

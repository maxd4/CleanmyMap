import type { Metadata } from "next";
import { ActionDeclarationForm } from "@/components/actions/action-declaration-form";

export const metadata: Metadata = {
  title: "Aperçu du formulaire bénévole - CleanMyMap",
  description:
    "Version publique de prévisualisation du formulaire bénévole, sans protection Clerk.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PreviewActionsNewPage() {
  return (
    <div className="space-y-6">
      <section className="mx-auto max-w-7xl px-4 pt-6 md:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-emerald-300/20 bg-emerald-500/10 px-5 py-4 text-emerald-50 shadow-sm">
          <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-emerald-100/70">
            Aperçu public
          </p>
          <p className="mt-1 text-sm leading-6 text-emerald-50/80">
            Route de revue non protégée pour vérifier le formulaire sans connexion Clerk.
          </p>
        </div>
      </section>

      <ActionDeclarationForm
        actorNameOptions={["Aperçu local"]}
        defaultActorName="Aperçu local"
        userMetadata={{
          userId: "preview-local",
          displayName: "Aperçu local",
          username: "preview-local",
          email: undefined,
        }}
        initialMode="complete"
        initialRecordType="action"
      />
    </div>
  );
}

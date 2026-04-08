import { auth } from "@clerk/nextjs/server";
import { ActionDeclarationForm } from "@/components/actions/action-declaration-form";
import { getCurrentUserIdentity } from "@/lib/authz";

export default async function NewActionPage() {
  const { userId } = await auth();
  const identity = await getCurrentUserIdentity();
  const fallbackActorName = userId ?? "unknown-user";
  const actorNameOptions =
    identity?.actorNameOptions && identity.actorNameOptions.length > 0 ? identity.actorNameOptions : [fallbackActorName];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Parcours prioritaire</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Déclaration de nettoyage</h1>
        <p className="mt-2 text-sm text-slate-600">
          Cette page remplace le formulaire Streamlit pour le flux principal de saisie bénévole.
        </p>
      </section>

      <ActionDeclarationForm
        actorNameOptions={actorNameOptions}
        defaultActorName={actorNameOptions[0]}
        clerkIdentityLabel={identity?.displayName ?? fallbackActorName}
        clerkUserId={identity?.userId ?? fallbackActorName}
      />
    </div>
  );
}

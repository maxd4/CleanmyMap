import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { redirect } from "next/navigation";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { toProfile } from "@/lib/profiles";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";

export default async function ParcoursRootPage() {
  const { userId, clerkReachable } = await getSafeAuthSession();
  const classes = getBlockClasses("home");

  if (!userId) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title="Parcours personnalisé"
        description={
          clerkReachable
            ? "Connectez-vous pour accéder au parcours associé à votre profil."
            : "Connexion Clerk temporairement indisponible. La vue reste lisible."
        }
        lockedPreview={
          <section className={cn("space-y-4 rounded-[2rem] border p-6", classes.surface)}>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { 
                  label: "Découvrir", 
                  desc: "Le parcours guide les bénévoles selon leur profil." 
                },
                { 
                  label: "Agir", 
                  desc: "Les actions recommandées apparaissent une fois connecté." 
                },
                { 
                  label: "Suivre", 
                  desc: "Le suivi d'impact reste attaché au compte Clerk." 
                }
              ].map((item, i) => (
                <article key={i} className="rounded-2xl border border-amber-200/40 bg-amber-50/80 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/70">
                    {item.label}
                  </p>
                  <p className="mt-2 text-xs text-slate-700/80 leading-relaxed">
                    {item.desc}
                  </p>
                </article>
              ))}
            </div>
          </section>
        }
      >
        <div />
      </ClerkRequiredGate>
    );
  }

  const role = await getCurrentUserRoleLabel().catch(() => "anonymous" as const);
  const profile = toProfile(role);
  redirect(`/parcours/${profile}`);
}

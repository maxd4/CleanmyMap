import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { redirect } from "next/navigation";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { toProfile } from "@/lib/profiles";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";

export default async function ParcoursRootPage() {
  const { userId, clerkReachable } = await getSafeAuthSession();
  const classes = getBlockClasses("act");

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
                <article key={i} className="rounded-2xl border border-white/5 bg-emerald-400/5 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/60">
                    {item.label}
                  </p>
                  <p className="mt-2 text-xs text-emerald-100/40 leading-relaxed">
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

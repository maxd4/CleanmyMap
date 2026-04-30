import { auth } from "@clerk/nextjs/server";
import { ArrowRight, Compass, Home, LockKeyhole, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { toProfile } from "@/lib/profiles";

export default async function PilotageAccessPage() {
  const { userId } = await auth();
  const role = userId
    ? await getCurrentUserRoleLabel().catch(() => "anonymous" as const)
    : ("anonymous" as const);
  const profile = toProfile(role);
  const canAccessPilotage =
    profile === "coordinateur" || profile === "max";

  if (userId && profile === "admin") {
    redirect("/admin");
  }

  const isAuthenticated = Boolean(userId);

  return (
    <section className="relative mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-5xl items-center justify-center px-3 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]">
        <div className="absolute left-1/2 top-12 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/12 blur-3xl" />
        <div className="absolute bottom-8 right-10 h-64 w-64 rounded-full bg-indigo-400/10 blur-3xl" />
      </div>

      <div className="relative w-full overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(135deg,rgba(22,45,67,0.94),rgba(12,24,44,0.96))] p-6 shadow-[0_34px_76px_-36px_rgba(6,17,30,0.82)] sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#0F6FFF] via-[#20C6D5] to-[#17C486]" />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
          <div className="flex justify-center lg:justify-start">
            <div className="relative flex h-40 w-40 items-center justify-center rounded-[2rem] border border-white/12 bg-[#102036] shadow-[0_24px_60px_-34px_rgba(6,17,30,0.9)] sm:h-48 sm:w-48">
              <div className="absolute inset-5 rounded-[1.4rem] border border-cyan-300/14 bg-cyan-300/8" />
              {canAccessPilotage ? (
                <Compass className="relative h-20 w-20 text-cyan-200" />
              ) : isAuthenticated ? (
                <ShieldAlert className="relative h-20 w-20 text-amber-200" />
              ) : (
                <LockKeyhole className="relative h-20 w-20 text-cyan-200" />
              )}
            </div>
          </div>

          <div className="space-y-6 text-center lg:text-left">
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200/78">
                Bloc Piloter
              </p>
              <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-black leading-[1.02] tracking-[-0.03em] text-white">
                {canAccessPilotage
                  ? "Pilotage opérationnel ouvert"
                  : isAuthenticated
                    ? "Accès pilotage réservé"
                    : "Authentification requise"}
              </h1>
              <p className="mx-auto max-w-2xl text-base leading-relaxed text-white/70 lg:mx-0">
                {canAccessPilotage
                  ? "Votre profil peut piloter les actions depuis les vues de coordination. Les espaces de suivi restent accessibles pour consulter les indicateurs, les priorités et l’historique."
                  : isAuthenticated
                    ? "Votre compte est bien connecté, mais il ne dispose pas encore des droits nécessaires pour visiter le bloc Piloter."
                    : "Connectez-vous avec un compte autorisé pour vérifier l'accès au bloc Piloter."}
              </p>
            </div>

            {canAccessPilotage ? (
              <>
                <div className="rounded-[1.35rem] border border-white/10 bg-white/6 p-4 text-left">
                  <p className="text-sm font-semibold leading-relaxed text-white/76">
                    Le bloc Piloter rassemble les vues de coordination, les
                    indicateurs de synthèse et les accès rapides vers les
                    tableaux de bord de suivi.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/dashboard"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#20C6D5] to-[#17C486] px-5 text-sm font-bold text-white shadow-[0_18px_30px_-18px_rgba(23,196,134,0.58)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/50"
                  >
                    <Compass size={17} />
                    Tableau de bord
                  </Link>
                  <Link
                    href="/reports"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-5 text-sm font-bold text-white transition-colors hover:border-cyan-300/30 hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/40"
                  >
                    <ArrowRight size={17} />
                    Rapports
                  </Link>
                  <Link
                    href="/observatoire"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-5 text-sm font-bold text-white transition-colors hover:border-violet-300/30 hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/40"
                  >
                    <Home size={17} />
                    Observatoire
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-5 text-sm font-bold text-white transition-colors hover:border-violet-300/30 hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/40"
                  >
                    <Home size={17} />
                    Accueil
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-[1.35rem] border border-white/10 bg-white/6 p-4 text-left">
                  <p className="text-sm font-semibold leading-relaxed text-white/76">
                    Le pilotage est réservé aux profils Coordination et IMU.
                    Les comptes uniquement administratifs gardent l&apos;accès
                    aux outils d&apos;administration, mais ne pilotent pas les
                    actions terrain.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                  {!isAuthenticated ? (
                    <Link
                      href="/sign-in?redirect_url=/pilotage"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#20C6D5] to-[#17C486] px-5 text-sm font-bold text-white shadow-[0_18px_30px_-18px_rgba(23,196,134,0.58)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/50"
                    >
                      Se connecter
                      <ArrowRight size={17} />
                    </Link>
                  ) : null}
                  <Link
                    href="/"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-5 text-sm font-bold text-white transition-colors hover:border-cyan-300/30 hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/40"
                  >
                    <Home size={17} />
                    Accueil
                  </Link>
                  <Link
                    href="/explorer"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-5 text-sm font-bold text-white transition-colors hover:border-violet-300/30 hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/40"
                  >
                    <Compass size={17} />
                    Explorer
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

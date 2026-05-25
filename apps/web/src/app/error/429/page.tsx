import { Gauge } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import {
  SystemStateAction,
  SystemStateDescription,
  SystemStateIcon,
  SystemStateLayout,
  SystemStateMeta,
  SystemStateTitle,
} from "@/components/ui/system-state";
import { SystemStateRetryButton } from "@/components/ui/system-state-retry-button";
import { resolvePublicContactEmail } from "@/lib/email-config";

export default function RateLimitErrorPage() {
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,250,232,0.92)_0%,rgba(255,244,221,0.88)_44%,rgba(255,247,237,0.92)_100%)]" />
      <div className="absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.16)_0%,rgba(245,158,11,0.08)_28%,rgba(245,158,11,0)_72%)] blur-[100px]" />
      <div className="absolute -left-20 top-28 h-[20rem] w-[20rem] rounded-full bg-[radial-gradient(circle,rgba(248,113,113,0.10)_0%,rgba(248,113,113,0.06)_28%,rgba(248,113,113,0)_72%)] blur-[110px]" />
      <div className="absolute bottom-0 right-0 h-[18rem] w-[18rem] rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.10)_0%,rgba(251,191,36,0.05)_28%,rgba(251,191,36,0)_72%)] blur-[110px]" />

      <SystemStateLayout variant="warning" className="relative z-10">
        <SystemStateIcon variant="warning">
          <Gauge className="h-7 w-7" />
        </SystemStateIcon>

        <SystemStateTitle variant="warning">Trop de requêtes</SystemStateTitle>

        <SystemStateDescription variant="warning">
          Vous avez envoyé trop de demandes en peu de temps. Veuillez patienter quelques instants avant de réessayer.
        </SystemStateDescription>

        <SystemStateMeta variant="warning" label="Pourquoi cette limite ?">
          Cette limite protège le service contre les abus et assure une bonne qualité pour tous les utilisateurs.
        </SystemStateMeta>

        <SystemStateAction>
          <SystemStateRetryButton />
          <CmmButton href="/accueil" tone="secondary">
            Retour à l&apos;accueil
          </CmmButton>
        </SystemStateAction>

        <p className="text-xs leading-5 text-slate-500">
          Si le problème persiste, contactez-nous à{" "}
          <a className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-4" href={`mailto:${contactEmail}`}>
            {contactEmail}
          </a>
        </p>
      </SystemStateLayout>
    </main>
  );
}

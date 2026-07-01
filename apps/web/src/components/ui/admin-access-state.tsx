import { ArrowLeft, LogIn, ShieldAlert } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import {
  SystemStateAction,
  SystemStateDescription,
  SystemStateIcon,
  SystemStateLayout,
  SystemStateMeta,
  SystemStateTitle,
} from "@/components/ui/system-state";

type AdminAccessStateProps = {
  signInHref?: string;
  dashboardHref?: string;
  className?: string;
};

export function AdminAccessState({
  signInHref = "/sign-in",
  dashboardHref = "/dashboard",
  className,
}: AdminAccessStateProps) {
  return (
    <SystemStateLayout variant="forbidden" className={className}>
      <SystemStateIcon variant="forbidden">
        <ShieldAlert className="h-7 w-7" />
      </SystemStateIcon>
      <SystemStateMeta variant="forbidden" label="Accès administrateur requis">
        Cette page est temporairement réservée aux administrateurs afin de préserver les quotas gratuits Supabase et Vercel.
      </SystemStateMeta>
      <SystemStateTitle variant="forbidden">Accès administrateur requis</SystemStateTitle>
      <SystemStateDescription variant="forbidden">
        Si vous faites partie de l&apos;équipe, connectez-vous avec le bon compte admin. Sinon, revenez au tableau de bord.
      </SystemStateDescription>
      <SystemStateAction>
        <CmmButton href={signInHref} tone="primary">
          <LogIn className="h-4 w-4" />
          Se connecter
        </CmmButton>
        <CmmButton href={dashboardHref} tone="secondary">
          <ArrowLeft className="h-4 w-4" />
          Retour au tableau de bord
        </CmmButton>
      </SystemStateAction>
    </SystemStateLayout>
  );
}

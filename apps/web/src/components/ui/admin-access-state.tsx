import { ArrowLeft, LogIn, ShieldAlert, WifiOff } from "lucide-react";
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
  authUnavailable?: boolean;
  className?: string;
};

export function AdminAccessState({
  signInHref = "/sign-in",
  dashboardHref = "/dashboard",
  authUnavailable = false,
  className,
}: AdminAccessStateProps) {
  const variant = authUnavailable ? "offline" : "forbidden";

  return (
    <SystemStateLayout variant={variant} className={className}>
      <SystemStateIcon variant={variant}>
        {authUnavailable ? <WifiOff className="h-7 w-7" /> : <ShieldAlert className="h-7 w-7" />}
      </SystemStateIcon>
      <SystemStateMeta
        variant={variant}
        label={authUnavailable ? "Authentification indisponible" : "Accès administrateur requis"}
      >
        {authUnavailable
          ? "L'état de votre session ne peut pas être vérifié pour le moment."
          : "Cette page est temporairement réservée aux administrateurs afin de préserver les quotas gratuits Supabase et Vercel."}
      </SystemStateMeta>
      <SystemStateTitle variant={variant}>
        {authUnavailable ? "Authentification temporairement indisponible" : "Accès administrateur requis"}
      </SystemStateTitle>
      <SystemStateDescription variant={variant}>
        {authUnavailable
          ? "Le service d'identité ne répond pas. Réessayez dans quelques instants ; votre compte n'est pas considéré comme déconnecté."
          : "Si vous faites partie de l'équipe, connectez-vous avec le bon compte admin. Sinon, revenez au tableau de bord."}
      </SystemStateDescription>
      <SystemStateAction>
        <CmmButton href={signInHref} tone="primary">
          <LogIn className="h-4 w-4" />
          {authUnavailable ? "Réessayer" : "Se connecter"}
        </CmmButton>
        <CmmButton href={dashboardHref} tone="secondary">
          <ArrowLeft className="h-4 w-4" />
          Retour au tableau de bord
        </CmmButton>
      </SystemStateAction>
    </SystemStateLayout>
  );
}

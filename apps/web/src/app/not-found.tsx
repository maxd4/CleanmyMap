import { MapPinOff } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmIcon } from "@/components/ui/cmm-icon";
import {
  SystemStateAction,
  SystemStateDescription,
  SystemStateIcon,
  SystemStateLayout,
  SystemStateTitle,
} from "@/components/ui/system-state";
import { HOME_ROUTE } from "@/lib/home-routes";

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,rgba(248,250,252,0.98)_0%,rgba(241,245,249,0.96)_56%,rgba(236,253,245,0.9)_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="absolute -right-24 top-16 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.14)_0%,rgba(16,185,129,0.05)_34%,rgba(16,185,129,0)_72%)] blur-[100px]"
      />

      <SystemStateLayout variant="empty" className="relative z-10">
        <SystemStateIcon variant="empty">
          <CmmIcon icon={MapPinOff} size="xl" />
        </SystemStateIcon>

        <SystemStateTitle variant="empty">Page introuvable</SystemStateTitle>

        <SystemStateDescription variant="empty">
          Cette adresse ne correspond à aucune page connue. Même les meilleurs navigateurs peuvent parfois s&apos;égarer.
        </SystemStateDescription>

        <SystemStateAction>
          <CmmButton href={HOME_ROUTE} tone="primary">
            Retour à l&apos;accueil
          </CmmButton>
        </SystemStateAction>
      </SystemStateLayout>
    </main>
  );
}

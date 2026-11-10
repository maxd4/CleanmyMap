"use client";

import { ArrowLeft, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { CmmButton } from "@/components/ui/cmm-button";
import {
  SystemStateAction,
  SystemStateDescription,
  SystemStateIcon,
  SystemStateLayout,
  SystemStateTitle,
} from "@/components/ui/system-state";

export default function SpogomiPrivateNotFound() {
  const router = useRouter();

  function goBackOrToSpogomi() {
    if (typeof window !== "undefined" && window.history.length > 1 && document.referrer) {
      try {
        if (new URL(document.referrer).origin === window.location.origin) {
          window.history.back();
          return;
        }
      } catch {
        // A malformed referrer must use the safe in-app fallback below.
      }
    }
    router.replace("/spogomi");
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,rgba(248,250,252,0.98)_0%,rgba(254,242,242,0.96)_56%,rgba(236,253,245,0.9)_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <SystemStateLayout variant="forbidden" role="alert" ariaLive="polite">
        <SystemStateIcon variant="forbidden">
          <LockKeyhole className="h-7 w-7" aria-hidden="true" />
        </SystemStateIcon>
        <SystemStateTitle variant="forbidden">Cette page n&apos;est pas accessible</SystemStateTitle>
        <SystemStateDescription variant="forbidden">
          Cette ressource privée n&apos;est pas disponible pour cette session ou ce lien.
        </SystemStateDescription>
        <SystemStateAction>
          <CmmButton type="button" tone="primary" onClick={goBackOrToSpogomi}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Retour à la page précédente
          </CmmButton>
        </SystemStateAction>
      </SystemStateLayout>
    </main>
  );
}

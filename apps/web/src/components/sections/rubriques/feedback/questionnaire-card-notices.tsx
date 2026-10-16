import { ArrowRight, BadgeCheck } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import type { Locale } from "../feedback-section.shared";

export function QuestionnaireRecognitionNotice({ locale }: { locale: Locale }) {
  return (
    <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 px-4 py-3 text-slate-700" role="note">
      <div className="flex items-start gap-3">
        <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">
            {locale === "fr" ? "Votre contribution peut être récompensée" : "Your contribution may be rewarded"}
          </p>
          <p className="mt-1 text-sm leading-relaxed">
            {locale === "fr"
              ? "Un bug ou une amélioration jugé pertinent par l'équipe CleanMyMap compte dans votre progression Amélioration du produit. Débloquez des badges et gagnez des XP en atteignant de nouveaux paliers."
              : "A bug or improvement judged relevant by the CleanMyMap team counts toward your Product improvement progression. Unlock badges and earn XP by reaching new tiers."}
          </p>
          <CmmDisclosure
            tone="amber"
            size="sm"
            className="mt-2"
            summary={locale === "fr" ? "Conditions de reconnaissance" : "Recognition conditions"}
          >
            <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
              <li>
                {locale === "fr"
                  ? "Le retour doit être utile et suffisamment précis."
                  : "The feedback must be useful and sufficiently precise."}
              </li>
              <li>
                {locale === "fr"
                  ? "La pertinence est validée par le compte autorisé max."
                  : "Relevance is reviewed by the authorized max account."}
              </li>
              <li>
                {locale === "fr"
                  ? "Les doublons et les propositions non retenues ne comptent pas."
                  : "Duplicates and proposals that are not retained do not count."}
              </li>
              <li>
                {locale === "fr"
                  ? "L'envoi seul ne garantit ni badge ni XP : les XP sont attribués aux paliers prévus par les règles actuelles."
                  : "Sending alone does not guarantee a badge or XP: XP is awarded at the tiers defined by the current rules."}
              </li>
            </ul>
          </CmmDisclosure>
          <CmmButton
            href="/sections/gamification"
            tone="secondary"
            variant="pill"
            className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-xl border border-amber-300/80 bg-white/70 px-3 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
          >
            {locale === "fr" ? "Découvrir les badges" : "Discover the badges"}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </CmmButton>
        </div>
      </div>
    </div>
  );
}

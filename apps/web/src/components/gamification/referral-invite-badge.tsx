"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, QrCode, Share2, Users } from "lucide-react";
import { QRCodeDialog } from "@/components/ui/qrcode-dialog";
import { CmmButton } from "@/components/ui/cmm-button";
import { announceGamificationGain } from "@/lib/gamification/announcements";
import type { ReferralSummary } from "@/lib/gamification/referrals";

type ReferralInviteBadgeProps = {
  summary: ReferralSummary;
};

function buildShareText(inviteUrl: string): string {
  return [
    "Rejoins CleanMyMap avec mon lien d'invitation :",
    inviteUrl,
  ].join("\n");
}

export function ReferralInviteBadge({ summary }: ReferralInviteBadgeProps) {
  const [currentSummary, setCurrentSummary] = useState(summary);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setCurrentSummary(summary);
  }, [summary]);

  const shareText = useMemo(() => {
    if (!currentSummary.inviteUrl) {
      return "Générez d'abord votre lien d'invitation.";
    }
    return buildShareText(currentSummary.inviteUrl);
  }, [currentSummary.inviteUrl]);

  async function handleCreateInvite() {
    if (currentSummary.inviteUrl) {
      return;
    }

    try {
      setErrorMessage(null);
      setIsCreating(true);
      const response = await fetch("/api/gamification/referrals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            status?: string;
            created?: boolean;
            summary?: ReferralSummary;
            error?: string;
          }
        | null;

      if (!response.ok || !payload?.summary) {
        throw new Error(payload?.error ?? "Impossible de créer le lien d'invitation.");
      }

      setCurrentSummary(payload.summary);

      if (payload.created) {
        announceGamificationGain({
          title: "Badge invité un ami",
          message: "+2 XP pour la première invitation générée.",
          tone: "generic",
          icon: "share-2",
          source: "referral-invite",
          dedupeKey: `referral-invite:${payload.summary.referralCode ?? currentSummary.inviteUrl ?? "created"}`,
        });
      }
    } catch (error) {
      console.error("Referral invite creation failed", error);
      setErrorMessage("Impossible de créer le lien d'invitation pour le moment.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCopy() {
    if (!currentSummary.inviteUrl || typeof navigator === "undefined") {
      return;
    }

    await navigator.clipboard.writeText(currentSummary.inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function handleShare() {
    if (!currentSummary.inviteUrl || typeof navigator === "undefined" || !navigator.share) {
      return;
    }

    await navigator.share({
      title: "CleanMyMap - Invitation",
      text: shareText,
      url: currentSummary.inviteUrl,
    });
  }

  const hasInviteUrl = Boolean(currentSummary.inviteUrl);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-amber-200/14 bg-[linear-gradient(145deg,rgba(69,26,3,0.94)_0%,rgba(92,45,12,0.92)_54%,rgba(245,158,11,0.26)_100%)] p-6 shadow-[0_24px_70px_-42px_rgba(92,45,12,0.65)]">
      <div className="absolute inset-0 rounded-[2rem] bg-amber-300/5 blur-3xl" />
      <div className="relative z-10 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-50/80">
              <Users size={13} />
              Inviter un ami
            </p>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-white">
              Badge one-shot de parrainage
            </h3>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-amber-50/75">
              Créez un lien d&apos;invitation pour permettre à un proche de rejoindre CleanMyMap.
              La première génération du lien débloque +2 XP et enregistre la chaîne de parrainage dans la base.
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
              {currentSummary.badgeUnlocked ? "Débloqué" : "Disponible"}
            </p>
            <p className="mt-1 text-3xl font-black tracking-tight text-white">
              +2
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
              XP
            </p>
          </div>
        </div>

        {currentSummary.invitedBy ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-amber-50/78">
            Parrainé par <span className="font-bold text-white">{currentSummary.invitedBy.displayName}</span>.
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-center">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/45">
              Parrainés
            </div>
            <div className="mt-1 text-lg font-black text-white">{currentSummary.invitedUsersCount}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-center">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/45">
              Parrainage
            </div>
            <div className="mt-1 text-lg font-black text-white">
              {currentSummary.referralCode ?? "À générer"}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-center">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/45">
              Statut
            </div>
            <div className="mt-1 text-lg font-black text-white">
              {hasInviteUrl ? "Prêt à partager" : "Non créé"}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {!hasInviteUrl ? (
            <CmmButton
              type="button"
              tone="primary"
              variant="pill"
              onClick={() => void handleCreateInvite()}
              disabled={isCreating}
              className="min-w-[220px]"
            >
              {isCreating ? "Création..." : "Créer mon lien d'invitation"}
            </CmmButton>
          ) : (
            <>
              <CmmButton
                type="button"
                tone="primary"
                variant="pill"
                onClick={() => void handleCopy()}
                className="min-w-[180px]"
              >
                <Copy size={14} />
                {copied ? "Copié" : "Copier le lien"}
              </CmmButton>
              <CmmButton
                type="button"
                tone="secondary"
                variant="pill"
                onClick={() => void handleShare()}
                className="min-w-[170px]"
              >
                <Share2 size={14} />
                Partager
              </CmmButton>
              <CmmButton
                type="button"
                tone="secondary"
                variant="pill"
                onClick={() => setIsQrOpen(true)}
                className="min-w-[170px]"
              >
                <QrCode size={14} />
                QR code
              </CmmButton>
            </>
          )}
        </div>

        {hasInviteUrl ? (
          <p className="break-all rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-medium text-amber-50/72">
            {currentSummary.inviteUrl}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100">
            {errorMessage}
          </p>
        ) : null}
      </div>

      {currentSummary.inviteUrl ? (
        <QRCodeDialog
          isOpen={isQrOpen}
          onClose={() => setIsQrOpen(false)}
          value={currentSummary.inviteUrl}
          title="Lien d'invitation CleanMyMap"
          description="Scannez ce QR code ou copiez le lien pour inviter un ami."
        />
      ) : null}
    </section>
  );
}

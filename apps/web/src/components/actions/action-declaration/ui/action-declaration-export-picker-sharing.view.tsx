import { Copy, Link2, Share2 } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";

type ActionDeclarationExportPickerSharingProps = {
  isCompactViewport: boolean;
  shareText: string;
  handleShareText: () => Promise<void>;
  handleCopyLink: () => Promise<void>;
  handleNativeShare: () => Promise<void>;
};

export function ActionDeclarationExportPickerSharing({
  isCompactViewport,
  shareText,
  handleShareText,
  handleCopyLink,
  handleNativeShare,
}: ActionDeclarationExportPickerSharingProps) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
            Partage direct
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 sm:pr-2">
            Copier le lien, partager nativement ou récupérer un texte prêt à publier
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
          Texte
        </span>
      </div>

      <div className="mt-3">
        {isCompactViewport ? (
          <div className="grid grid-cols-3 gap-2">
            <CmmButton
              type="button"
              tone="secondary"
              size="sm"
              variant="ghost"
              className="min-h-0 flex-1 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold leading-tight text-slate-700"
              onClick={() => void handleNativeShare()}
            >
              <span className="inline-flex items-center gap-1.5">
                <Share2 size={14} />
                Natif
              </span>
            </CmmButton>
            <CmmButton
              type="button"
              tone="secondary"
              size="sm"
              variant="ghost"
              className="min-h-0 flex-1 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold leading-tight text-slate-700"
              onClick={() => void handleCopyLink()}
            >
              <span className="inline-flex items-center gap-1.5">
                <Link2 size={14} />
                Lien
              </span>
            </CmmButton>
            <CmmButton
              type="button"
              tone="secondary"
              size="sm"
              variant="ghost"
              className="min-h-0 flex-1 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold leading-tight text-slate-700"
              onClick={() => void handleShareText()}
            >
              <span className="inline-flex items-center gap-1.5">
                <Copy size={14} />
                Texte
              </span>
            </CmmButton>
          </div>
        ) : (
          <>
            <textarea
              readOnly
              value={shareText}
              className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-700 outline-none sm:min-h-40"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <CmmButton type="button" tone="secondary" size="sm" onClick={() => void handleNativeShare()}>
                Partager natif
              </CmmButton>
              <CmmButton type="button" tone="secondary" size="sm" onClick={() => void handleCopyLink()}>
                Copier le lien
              </CmmButton>
              <CmmButton type="button" tone="secondary" size="sm" onClick={() => void handleShareText()}>
                Copier le texte
              </CmmButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

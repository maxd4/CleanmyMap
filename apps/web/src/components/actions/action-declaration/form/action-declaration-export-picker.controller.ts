import { useEffect, useMemo, useState } from "react";
import { exportFormAsPdf } from "@/lib/actions/exports/export-form-pdf";
import {
  buildActionDeclarationExportFilename,
  buildActionDeclarationExportPreviewDataUrl,
  buildActionDeclarationShareText,
  downloadActionDeclarationExportImage,
  getActionDeclarationExportBundle,
  getActionDeclarationExportBundles,
  getActionDeclarationExportTargets,
  type ActionDeclarationExportBundleId,
  type ActionDeclarationExportTarget,
} from "@/lib/actions/exports/export-form-media";
import {
  downloadActionDeclarationExportBundle,
  getActionDeclarationExportBundleImageTargets,
} from "@/lib/actions/exports/export-form-bundle";
import {
  createActionDeclarationExportHistoryEntry,
  mergeActionDeclarationExportHistory,
  readActionDeclarationExportHistory,
  writeActionDeclarationExportHistory,
  type ActionDeclarationExportHistoryEntry,
} from "@/lib/actions/exports/export-form-history";
import type { FormState } from "./model";
import {
  getDefaultBundleId,
  getDefaultTargetId,
  getOrderedActionDeclarationExportBundles,
  getOrderedActionDeclarationExportTargets,
  resolveActionDeclarationExportTarget,
} from "./action-declaration-export-picker.model";

export type ActionDeclarationExportPickerControllerProps = {
  isOpen: boolean;
  onClose: () => void;
  form: FormState;
  actorName: string;
};

type ExportStatus = "idle" | "exporting-single" | "exporting-bundle";

function useCompactViewport(): boolean {
  const [isCompactViewport, setIsCompactViewport] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia("(max-width: 767px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(max-width: 767px)");
    const update = () => {
      setIsCompactViewport(media.matches);
    };

    update();
    media.addEventListener("change", update);

    return () => {
      media.removeEventListener("change", update);
    };
  }, []);

  return isCompactViewport;
}

export type ActionDeclarationExportPickerController = {
  targets: ReturnType<typeof getActionDeclarationExportTargets>;
  isCompactViewport: boolean;
  status: ExportStatus;
  errorMessage: string | null;
  shareMessage: string | null;
  history: ActionDeclarationExportHistoryEntry[];
  activeBundle: ReturnType<typeof getActionDeclarationExportBundle>;
  activeBundleImageTargets: ReturnType<typeof getActionDeclarationExportBundleImageTargets>;
  orderedBundles: ReturnType<typeof getOrderedActionDeclarationExportBundles>;
  orderedTargets: ReturnType<typeof getOrderedActionDeclarationExportTargets>;
  selectedTarget: ActionDeclarationExportTarget | undefined;
  previewSrc: string;
  shareText: string;
  shareUrl: string;
  onSelectBundle: (bundleId: ActionDeclarationExportBundleId) => void;
  onSelectTarget: (targetId: ActionDeclarationExportTarget["id"]) => void;
  handleExport: (target: ActionDeclarationExportTarget) => Promise<void>;
  handleDownloadBundle: () => Promise<void>;
  handleShareText: () => Promise<void>;
  handleCopyLink: () => Promise<void>;
  handleNativeShare: () => Promise<void>;
  handleReplayHistoryEntry: (entry: ActionDeclarationExportHistoryEntry) => Promise<void>;
};

export function useActionDeclarationExportPickerController({
  isOpen,
  onClose,
  form,
  actorName,
}: ActionDeclarationExportPickerControllerProps): ActionDeclarationExportPickerController {
  const targets = useMemo(() => getActionDeclarationExportTargets(), []);
  const bundles = useMemo(() => getActionDeclarationExportBundles(), []);
  const isCompactViewport = useCompactViewport();
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<ActionDeclarationExportHistoryEntry[]>(() =>
    readActionDeclarationExportHistory(),
  );
  const [activeBundleId, setActiveBundleId] = useState<ActionDeclarationExportBundleId>(
    getDefaultBundleId(isCompactViewport),
  );
  const [selectedTargetId, setSelectedTargetId] = useState<ActionDeclarationExportTarget["id"]>(
    getDefaultTargetId(isCompactViewport),
  );

  const activeBundle = useMemo(
    () => getActionDeclarationExportBundle(activeBundleId),
    [activeBundleId],
  );
  const activeBundleImageTargets = useMemo(
    () => getActionDeclarationExportBundleImageTargets(activeBundleId),
    [activeBundleId],
  );
  const orderedBundles = useMemo(
    () => getOrderedActionDeclarationExportBundles(bundles, isCompactViewport),
    [bundles, isCompactViewport],
  );
  const orderedTargets = useMemo(
    () => getOrderedActionDeclarationExportTargets(targets, activeBundle),
    [activeBundle, targets],
  );
  const selectedTarget = resolveActionDeclarationExportTarget(
    orderedTargets,
    selectedTargetId,
    targets,
  );
  const previewSrc = useMemo(() => {
    if (!selectedTarget || selectedTarget.id === "pdf") {
      return "";
    }

    return buildActionDeclarationExportPreviewDataUrl(form, actorName, selectedTarget.id);
  }, [actorName, form, selectedTarget]);
  const shareText = useMemo(
    () =>
      buildActionDeclarationShareText({
        form,
        actorName,
        exportLabel: selectedTarget?.label,
      }),
    [actorName, form, selectedTarget?.label],
  );
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  useEffect(() => {
    if (!isOpen) {
      setStatus("idle");
      setErrorMessage(null);
      setShareMessage(null);
      setActiveBundleId(getDefaultBundleId(isCompactViewport));
      setSelectedTargetId(getDefaultTargetId(isCompactViewport));
    }
  }, [isCompactViewport, isOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const source = readActionDeclarationExportHistory();
    setHistory(source);
  }, [isOpen]);

  useEffect(() => {
    try {
      writeActionDeclarationExportHistory(history);
    } catch {
      // localStorage can be unavailable in private or restricted contexts.
    }
  }, [history]);

  function onSelectBundle(bundleId: ActionDeclarationExportBundleId): void {
    const bundle = bundles.find((item) => item.id === bundleId);
    if (!bundle) {
      return;
    }

    setActiveBundleId(bundle.id);
    setSelectedTargetId(bundle.previewTargetId);
  }

  function onSelectTarget(targetId: ActionDeclarationExportTarget["id"]): void {
    setSelectedTargetId(targetId);
  }

  async function handleExport(target: ActionDeclarationExportTarget): Promise<void> {
    setStatus("exporting-single");
    setErrorMessage(null);

    try {
      if (target.id === "pdf") {
        const opened = exportFormAsPdf(form, actorName);
        if (!opened) {
          throw new Error("Le navigateur a bloqué l'ouverture du PDF.");
        }
      } else {
        await downloadActionDeclarationExportImage({
          form,
          actorName,
          presetId: target.id,
        });
      }

      const generatedAt = new Date().toISOString();
      const nextHistoryEntry = createActionDeclarationExportHistoryEntry({
        filename: buildActionDeclarationExportFilename(form, target.id === "pdf" ? "pdf" : target.id),
        label: target.label,
        sourceLabel: target.label,
        targetId: target.id,
        actorName,
        form,
      });
      nextHistoryEntry.generatedAt = generatedAt;
      setHistory((previous) => mergeActionDeclarationExportHistory(previous, [nextHistoryEntry]));

      onClose();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "L'export n'a pas pu être généré pour le moment.",
      );
    } finally {
      setStatus("idle");
    }
  }

  async function handleDownloadBundle(): Promise<void> {
    setStatus("exporting-bundle");
    setErrorMessage(null);

    try {
      const downloadedPresetIds = await downloadActionDeclarationExportBundle({
        form,
        actorName,
        bundleId: activeBundleId,
      });

      const generatedAt = new Date().toISOString();
      const bundleEntries = downloadedPresetIds
        .map((presetId) => {
          const target = targets.find((item) => item.id === presetId);
          if (!target) {
            return null;
          }

          return createActionDeclarationExportHistoryEntry({
            filename: buildActionDeclarationExportFilename(form, presetId),
            label: target.label,
            sourceLabel: activeBundle.label,
            targetId: presetId,
            actorName,
            form,
            bundleId: activeBundleId,
          });
        })
        .filter((entry): entry is ActionDeclarationExportHistoryEntry => Boolean(entry))
        .map((entry) => {
          entry.generatedAt = generatedAt;
          return entry;
        });

      setHistory((previous) => mergeActionDeclarationExportHistory(previous, bundleEntries));

      onClose();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Le lot d'exports n'a pas pu être généré pour le moment.",
      );
    } finally {
      setStatus("idle");
    }
  }

  async function handleShareText(): Promise<void> {
    setErrorMessage(null);
    setShareMessage(null);

    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
        setShareMessage("Texte prêt à publier partagé.");
        return;
      }

      await navigator.clipboard.writeText(shareText);
      setShareMessage("Texte prêt à publier copié.");
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Le partage n'a pas pu être effectué.",
      );
    }
  }

  async function handleCopyLink(): Promise<void> {
    setErrorMessage(null);
    setShareMessage(null);

    try {
      if (!shareUrl) {
        throw new Error("Le lien n'est pas disponible pour le moment.");
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareMessage("Lien copié.");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Le lien n'a pas pu être copié.",
      );
    }
  }

  async function handleNativeShare(): Promise<void> {
    setErrorMessage(null);
    setShareMessage(null);

    try {
      if (navigator.share) {
        await navigator.share({
          title: "CleanMyMap",
          text: shareText,
          url: shareUrl || undefined,
        });
        setShareMessage("Partage natif ouvert.");
        return;
      }

      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`.trim());
      setShareMessage("Texte et lien copiés.");
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Le partage n'a pas pu être effectué.",
      );
    }
  }

  async function handleReplayHistoryEntry(entry: ActionDeclarationExportHistoryEntry): Promise<void> {
    setStatus("exporting-single");
    setErrorMessage(null);

    try {
      if (entry.targetId === "pdf") {
        const opened = exportFormAsPdf(entry.form, entry.actorName);
        if (!opened) {
          throw new Error("Le navigateur a bloqué l'ouverture du PDF.");
        }
      } else {
        await downloadActionDeclarationExportImage({
          form: entry.form,
          actorName: entry.actorName,
          presetId: entry.targetId,
        });
      }
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Le fichier de l'historique n'a pas pu être généré.",
      );
    } finally {
      setStatus("idle");
    }
  }

  return {
    targets,
    isCompactViewport,
    status,
    errorMessage,
    shareMessage,
    history,
    activeBundle,
    activeBundleImageTargets,
    orderedBundles,
    orderedTargets,
    selectedTarget,
    previewSrc,
    shareText,
    shareUrl,
    onSelectBundle,
    onSelectTarget,
    handleExport,
    handleDownloadBundle,
    handleShareText,
    handleCopyLink,
    handleNativeShare,
    handleReplayHistoryEntry,
  };
}

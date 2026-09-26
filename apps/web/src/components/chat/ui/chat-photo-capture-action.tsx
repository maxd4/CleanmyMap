import { Camera } from "lucide-react";
import { useRef, type ChangeEvent } from "react";

import { CHAT_CAMERA_ACCEPT } from "@/lib/chat/chat-attachments";

export function ChatPhotoCaptureAction({
  canAttach,
  isLight,
  onClose,
  onFileSelection,
  showAction,
}: {
  canAttach: boolean;
  isLight: boolean;
  onClose: () => void;
  onFileSelection: (event: ChangeEvent<HTMLInputElement>) => void;
  showAction: boolean;
}) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  if (!showAction) {
    return null;
  }

  return (
    <>
      <input
        type="file"
        ref={cameraInputRef}
        hidden
        accept={CHAT_CAMERA_ACCEPT}
        capture="environment"
        onChange={onFileSelection}
      />
      <button
        type="button"
        disabled={!canAttach}
        aria-label="Prendre une photo"
        onClick={() => {
          onClose();
          cameraInputRef.current?.click();
        }}
        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left cmm-text-small font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${isLight ? "text-slate-700 hover:bg-rose-50" : "text-slate-200 hover:bg-white/5"}`}
      >
        <Camera size={16} aria-hidden="true" /> Prendre une photo
      </button>
    </>
  );
}

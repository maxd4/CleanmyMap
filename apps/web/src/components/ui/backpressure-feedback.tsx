"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle, AlertCircle, Clock, XCircle } from "lucide-react";

type BackpressureOperationType = "import" | "batch" | "event";

type BackpressureStatus = {
  active: number;
  queued: number;
  available: boolean;
};

type BackpressureStatusPayload = Record<BackpressureOperationType, BackpressureStatus> & {
  timestamp: number;
};

export type ProgressStatus = "idle" | "loading" | "processing" | "success" | "error" | "queued";

export interface BackpressureFeedbackProps {
  status: ProgressStatus;
  message?: string;
  progress?: number;
  queuePosition?: number;
  estimatedTime?: number;
  onCancel?: () => void;
  showDetails?: boolean;
}

export function BackpressureFeedback({
  status,
  message,
  progress,
  queuePosition,
  estimatedTime,
  onCancel,
  showDetails = false,
}: BackpressureFeedbackProps) {
  const [dots, setDots] = useState("");
  const isPageVisible = usePageVisibility();

  useEffect(() => {
    if (
      !isPageVisible ||
      !(status === "loading" || status === "processing" || status === "queued")
    ) {
      return;
    }

      const interval = setInterval(() => {
        setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
      }, 500);
      return () => clearInterval(interval);
  }, [isPageVisible, status]);

  const getIcon = () => {
    switch (status) {
      case "loading":
      case "queued":
        return <Clock className="w-5 h-5 text-amber-500" />;
      case "processing":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case "error":
        return <XCircle className="w-5 h-5 text-rose-500" />;
      default:
        return <Loader2 className="w-5 h-5 text-slate-400" />;
    }
  };

  const getDefaultMessage = () => {
    switch (status) {
      case "loading":
        return `Chargement${dots}`;
      case "processing":
        return `Traitement en cours${dots}`;
      case "queued":
        return `En attente (position ${queuePosition || "..."})${dots}`;
      case "success":
        return "Opération terminée";
      case "error":
        return "Une erreur s'est produite";
      default:
        return "";
    }
  };

  const statusClasses: Record<ProgressStatus, string> = {
    idle: "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700",
    loading: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    processing: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    queued: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    success: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
    error: "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800",
  };

  return (
    <div className={`p-4 rounded-xl border ${statusClasses[status]} transition-all`}>
      <div className="flex items-center gap-3">
        {getIcon()}
        <div className="flex-1">
          <p className="font-medium cmm-text-primary text-sm">
            {message || getDefaultMessage()}
          </p>
          
          {showDetails && (
            <div className="mt-2 space-y-1">
              {progress !== undefined && (
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
              
              {status === "queued" && estimatedTime && (
                <p className="text-xs cmm-text-muted">
                  Temps d&apos;attente estimé: ~{estimatedTime}s
                </p>
              )}
            </div>
          )}
        </div>
        
        {onCancel && (status === "loading" || status === "queued" || status === "processing") && (
          <button
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <XCircle className="w-4 h-4 cmm-text-muted" />
          </button>
        )}
      </div>
      
      {status === "queued" && queuePosition && queuePosition > 3 && (
        <div className="mt-3 p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <p className="text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <AlertCircle className="w-3 h-3" />
            Beaucoup de requêtes en attente. Votre opération sera traitée automatiquement.
          </p>
        </div>
      )}
    </div>
  );
}

function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const updateVisibility = () => {
      setIsVisible(document.visibilityState === "visible");
    };

    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    window.addEventListener("focus", updateVisibility);
    window.addEventListener("blur", updateVisibility);

    return () => {
      document.removeEventListener("visibilitychange", updateVisibility);
      window.removeEventListener("focus", updateVisibility);
      window.removeEventListener("blur", updateVisibility);
    };
  }, []);

  return isVisible;
}

export function useBackpressureStatus(
  operationType: BackpressureOperationType = "event",
  pollIntervalMs = 15000,
) {
  const [status, setStatus] = useState<BackpressureStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isPageVisible = usePageVisibility();

  useEffect(() => {
    if (!isPageVisible) {
      return;
    }

    let mounted = true;

    const checkStatus = async () => {
      try {
        const response = await fetch("/api/system/backpressure", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Erreur API (${response.status}) sur /api/system/backpressure`);
        }

        const data = (await response.json()) as BackpressureStatusPayload;
        if (mounted) {
          setStatus(data[operationType]);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to check status");
        }
      }
    };

    checkStatus();
    // Polling keeps the backpressure status fresh while the tab stays visible.
    const interval = setInterval(checkStatus, pollIntervalMs);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isPageVisible, operationType, pollIntervalMs]);

  return { status, error };
}

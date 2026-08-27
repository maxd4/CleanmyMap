"use client";

import { useState, useEffect } from "react";
import { Camera, MapPin, CheckCircle, AlertTriangle, Loader2, ArrowRight } from "lucide-react";
import { createAction } from "@/lib/actions/http";
import {
  createSignalementEvidenceUploadItem,
  uploadSignalementEvidence,
  type SignalementEvidenceUploadItem,
} from "@/lib/actions/signalement/signalement-media-client";
import Link from "next/link";
import { useSubmissionLock } from "@/hooks/use-submission-lock";
import { DASHBOARD_ROUTE } from "@/lib/accueil-pilotage-routes";
import { canRequestGeolocation } from "@/lib/browser/geolocation";
import { logFailure } from "@/lib/logging/failure-log";
import type { WasteCategorySlug } from "@/lib/waste";
import { WasteCategorySelector, WasteFieldSummary } from "@/components/waste/waste-category-selector";
import {
  buildQuickSignalementPayload,
  type QuickSignalementRecordType,
} from "@/lib/actions/signalement/quick-signalement";

export type TrashSpotterObservationFormProps = {
  initialLocation?: { lat: number; lng: number } | null;
  onSignalementCreated?: () => void;
};

export function TrashSpotterObservationForm({
  initialLocation = null,
  onSignalementCreated,
}: TrashSpotterObservationFormProps) {
  const [recordType, setRecordType] = useState<QuickSignalementRecordType>("spot");
  const [selectedCategories, setSelectedCategories] = useState<WasteCategorySlug[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(initialLocation);
  const [locStatus, setLocStatus] = useState<"idle" | "locating" | "success" | "error">(
    initialLocation ? "success" : "idle",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreparingPhotos, setIsPreparingPhotos] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPartialSuccess, setIsPartialSuccess] = useState(false);
  const [submittedRecordType, setSubmittedRecordType] = useState<QuickSignalementRecordType>("spot");
  const [photos, setPhotos] = useState<SignalementEvidenceUploadItem[]>([]);
  const [pendingPhotoUploads, setPendingPhotoUploads] = useState<SignalementEvidenceUploadItem[]>([]);
  const [submittedSignalementId, setSubmittedSignalementId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { acquire, release } = useSubmissionLock();
  const isCleanPlace = recordType === "clean_place";

  useEffect(() => {
    if (initialLocation) {
      setLocation(initialLocation);
      setLocStatus("success");
      return;
    }

    if (canRequestGeolocation()) {
      setLocStatus("locating");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocStatus("success");
        },
        () => setLocStatus("error"),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocStatus("error");
    }
  }, [initialLocation]);

  const handleSubmit = async () => {
    if ((!isCleanPlace && selectedCategories.length === 0) || !location) return;
    if (!acquire()) {
      setError("Un signalement est déjà en cours. Réessayez dans un instant.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createAction(
        buildQuickSignalementPayload({
          recordType,
          categories: selectedCategories,
          location,
          actionDate: new Date().toISOString().split("T")[0],
        }),
      );
      setSubmittedSignalementId(created.id);
      setSubmittedRecordType(recordType);
      onSignalementCreated?.();
      if (photos.length > 0) {
        setIsPreparingPhotos(true);
        const uploadResult = await uploadSignalementEvidence(
          created.id,
          photos,
        );
        if (uploadResult.failed.length > 0) {
          setPendingPhotoUploads(uploadResult.failed.map((failure) => failure.item));
          setIsPartialSuccess(true);
          setError(
            `${uploadResult.failed.length} preuve${uploadResult.failed.length > 1 ? "s" : ""} photo n'a pas pu être transmise.`,
          );
        } else {
          setIsSuccess(true);
        }
      } else {
        setIsSuccess(true);
      }
    } catch (err) {
      logFailure("QuickSignalement", "Submission failed", err, {
        selectedCategories,
        hasLocation: Boolean(location),
      });
      setError("Transmission échouée. Vérifiez votre GPS et réessayez.");
    } finally {
      setIsPreparingPhotos(false);
      setIsSubmitting(false);
      release();
    }
  };

  const retryPhotoUploads = async () => {
    if (!submittedSignalementId || pendingPhotoUploads.length === 0 || !acquire()) {
      return;
    }
    setIsPreparingPhotos(true);
    setError(null);
    try {
      const uploadResult = await uploadSignalementEvidence(
        submittedSignalementId,
        pendingPhotoUploads,
      );
      if (uploadResult.failed.length > 0) {
        setPendingPhotoUploads(uploadResult.failed.map((failure) => failure.item));
        setError("Certaines preuves photo n'ont pas pu être transmises. Réessayez.");
        return;
      }
      setPendingPhotoUploads([]);
      setPhotos([]);
      setIsPartialSuccess(false);
      setIsSuccess(true);
    } finally {
      setIsPreparingPhotos(false);
      release();
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-16 space-y-10 animate-in zoom-in duration-700">
        <div className="w-24 h-24 bg-emerald-400/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-400/20 border border-emerald-400/30">
          <CheckCircle size={48} />
        </div>
         <div className="space-y-3">
           <h2 className="text-4xl font-black text-white tracking-tighter uppercase">
             {submittedRecordType === "clean_place" ? "Lieu propre signalé" : "Pollution signalée"}
           </h2>
           <p className="text-xl text-white/30 font-medium">
             {submittedRecordType === "clean_place"
               ? "La preuve du lieu propre est en cours de traitement par le cockpit."
               : "Le signalement de pollution est en cours de traitement par le cockpit."}
           </p>
        </div>
        <div className="pt-6 flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
          <button 
             onClick={() => {
               setIsSuccess(false);
               setIsPartialSuccess(false);
               setRecordType("spot");
               setSelectedCategories([]);
               setPhotos([]);
               setPendingPhotoUploads([]);
               setSubmittedSignalementId(null);
             }}
            className="flex-1 py-6 rounded-[2rem] bg-white text-black font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-400 transition-all active:scale-95"
          >
            Nouveau Signalement
          </button>
          <Link 
            href={DASHBOARD_ROUTE}
            className="flex-1 py-6 rounded-[2rem] bg-white/5 border border-white/5 text-white/60 font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all text-center flex items-center justify-center"
          >
            Dashboard
          </Link>
        </div>
        <Link
          href="#mes-observations"
          className="mx-auto inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
        >
          Voir mes observations
        </Link>
      </div>
    );
  }

  if (isPartialSuccess) {
    return (
      <div className="text-center py-16 space-y-10 animate-in zoom-in duration-700">
        <div className="w-24 h-24 bg-amber-400/20 text-amber-300 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-amber-400/20 border border-amber-400/30">
          <AlertTriangle size={48} />
        </div>
        <div className="space-y-3">
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Signalement créé</h2>
          <p className="text-xl text-white/50 font-medium">
            Le signalement est conservé, mais une ou plusieurs preuves photo restent à transmettre.
          </p>
        </div>
        <div className="pt-6 flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
          <button
            onClick={retryPhotoUploads}
            disabled={isPreparingPhotos}
            className="flex-1 py-6 rounded-[2rem] bg-amber-300 text-black font-black text-xs uppercase tracking-[0.2em] hover:bg-amber-200 transition-all active:scale-95 disabled:opacity-50"
          >
            {isPreparingPhotos ? "Nouvel essai..." : "Réessayer les photos"}
          </button>
          <Link
            href={DASHBOARD_ROUTE}
            className="flex-1 py-6 rounded-[2rem] bg-white/5 border border-white/5 text-white/60 font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all text-center flex items-center justify-center"
          >
            Continuer
          </Link>
        </div>
        <Link
          href="#mes-observations"
          className="mx-auto inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
        >
          Voir mes observations
        </Link>
        {error && <p className="text-sm font-bold text-amber-200">{error}</p>}
      </div>
    );
  }

   return (
     <div className="space-y-12">
       <div className="space-y-6">
         <div className="flex items-center justify-between">
           <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.3em]">01 • État observé du lieu</h3>
          <div className="flex items-center gap-2">
            {locStatus === "locating" && <Loader2 className="animate-spin text-emerald-400" size={14} />}
            {locStatus === "success" && <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest"><MapPin size={10} /> Localisé</div>}
            {locStatus === "error" && <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-400/10 border border-rose-400/20 text-[9px] font-black text-rose-400 uppercase tracking-widest"><AlertTriangle size={10} /> GPS Error</div>}
           </div>
         </div>
         <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="État observé du lieu">
           <button
             type="button"
             onClick={() => {
               setRecordType("spot");
               setError(null);
             }}
             aria-pressed={!isCleanPlace}
             className={`rounded-2xl border px-5 py-4 text-left transition ${!isCleanPlace ? "border-rose-300 bg-rose-400/15 text-white" : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/20"}`}
           >
             <span className="block text-sm font-black">Pollution constatée</span>
             <span className="mt-1 block text-xs font-medium text-current/65">Créer un spot à qualifier</span>
           </button>
           <button
             type="button"
             onClick={() => {
               setRecordType("clean_place");
               setSelectedCategories([]);
               setError(null);
             }}
             aria-pressed={isCleanPlace}
             className={`rounded-2xl border px-5 py-4 text-left transition ${isCleanPlace ? "border-emerald-300 bg-emerald-400/15 text-white" : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/20"}`}
           >
             <span className="block text-sm font-black">Lieu constaté propre</span>
             <span className="mt-1 block text-xs font-medium text-current/65">Créer une observation clean_place</span>
           </button>
         </div>
       </div>

       <div className="space-y-6">
         <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.3em]">02 • Catégories Waste</h3>
         {isCleanPlace ? (
           <div className="rounded-[2rem] border border-emerald-300/20 bg-emerald-400/10 p-6 text-sm font-medium text-emerald-100">
             Les catégories déchets sont désactivées pour un lieu constaté propre.
           </div>
         ) : (
           <>
             <WasteCategorySelector
               value={selectedCategories}
               onChange={setSelectedCategories}
               idPrefix="quick-signalement-waste"
               className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4"
             />
             <WasteFieldSummary value={selectedCategories} className="border-white/10 bg-white/[0.06] text-white" />
           </>
         )}
       </div>

       <div className="space-y-6">
         <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.3em]">03 • Preuve Visuelle</h3>
        <label className="group relative flex flex-col items-center justify-center gap-6 py-12 rounded-[3rem] border-2 border-dashed border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 hover:border-emerald-400/40 transition-all duration-500 overflow-hidden">
          <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity blur-[60px]" />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 transition-all group-hover:border-emerald-400/20 group-hover:bg-emerald-400/10 group-hover:text-emerald-400">
              <Camera size={28} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-white transition-colors">
              {photos.length > 0
                ? `${photos.length} photo${photos.length > 1 ? "s" : ""} sélectionnée${photos.length > 1 ? "s" : ""}`
                : "Déposer ou capturer"}
            </span>
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => {
              const nextFiles = Array.from(event.target.files || [])
                .slice(0, 3)
                .map(createSignalementEvidenceUploadItem);
              setPhotos(nextFiles);
              setError(null);
            }}
            className="hidden"
          />
        </label>
      </div>

      <div className="pt-8 space-y-6">
        {error && (
          <div className="p-5 rounded-2xl bg-rose-400/10 border border-rose-400/20 text-rose-400 text-xs font-bold text-center animate-shake">
            {error}
          </div>
        )}
        
         <button
           onClick={handleSubmit}
           disabled={(!isCleanPlace && selectedCategories.length === 0) || !location || isSubmitting || isPreparingPhotos}
          className="group relative w-full overflow-hidden rounded-[2.5rem] bg-emerald-500 p-8 text-black transition-all hover:bg-emerald-400 disabled:opacity-20 disabled:grayscale active:scale-[0.98] shadow-2xl shadow-emerald-500/20"
        >
          <div className="relative z-10 flex items-center justify-center gap-4">
            {isSubmitting || isPreparingPhotos ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span className="text-xs font-black uppercase tracking-[0.3em]">
                  {isPreparingPhotos ? "Préparation des photos..." : "Transmission..."}
                </span>
              </>
            ) : (
              <>
                 <span className="text-xs font-black uppercase tracking-[0.3em]">
                   {isCleanPlace ? "Signaler le lieu propre" : "Signaler la pollution"}
                 </span>
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-2" />
              </>
            )}
          </div>
        </button>
        
        {locStatus !== "success" && !isSubmitting && !isPreparingPhotos && (
          <p className="text-center text-[9px] font-black text-rose-400/60 uppercase tracking-[0.3em] animate-pulse">
            Acquisition du signal GPS requise...
          </p>
        )}
      </div>
    </div>
  );
}

/** Compatibility export for callers that still use the former quick-report name. */
export const QuickSignalementForm = TrashSpotterObservationForm;

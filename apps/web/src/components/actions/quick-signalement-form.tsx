"use client";

import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
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
import {
  parseQuickSignalementDraft,
  serializeQuickSignalementDraft,
} from "@/lib/actions/signalement/quick-signalement-draft";

const PENDING_DRAFT_STORAGE_KEY = "cmm:signalement:pending-draft:v1";

export type TrashSpotterObservationFormProps = {
  initialLocation?: { lat: number; lng: number } | null;
  onSignalementCreated?: () => void;
  isAuthenticated?: boolean;
  signInHref?: string;
  signUpHref?: string;
};

function useQuickSignalementLocation({
  initialLocation,
  setRecordType,
  setSelectedCategories,
  setLocation,
  setLocStatus,
}: {
  initialLocation: { lat: number; lng: number } | null;
  setRecordType: Dispatch<SetStateAction<QuickSignalementRecordType>>;
  setSelectedCategories: Dispatch<SetStateAction<WasteCategorySlug[]>>;
  setLocation: Dispatch<SetStateAction<{ lat: number; lng: number } | null>>;
  setLocStatus: Dispatch<SetStateAction<"idle" | "locating" | "success" | "error">>;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const rawDraft = window.sessionStorage.getItem(PENDING_DRAFT_STORAGE_KEY);
        if (rawDraft) {
          const draft = parseQuickSignalementDraft(rawDraft);
          if (draft?.recordType) setRecordType(draft.recordType);
          if (draft?.selectedCategories) setSelectedCategories(draft.selectedCategories);
          if (draft) {
            window.sessionStorage.setItem(PENDING_DRAFT_STORAGE_KEY, serializeQuickSignalementDraft(draft));
          } else {
            window.sessionStorage.removeItem(PENDING_DRAFT_STORAGE_KEY);
          }
        }
      } catch {
        // Local resume data is optional and must never block the form.
      }
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
          { enableHighAccuracy: true, timeout: 10000 },
        );
      } else {
        setLocStatus("error");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialLocation, setLocation, setLocStatus, setRecordType, setSelectedCategories]);
}

function QuickSignalementSuccessState({ submittedRecordType, onReset }: { submittedRecordType: QuickSignalementRecordType; onReset: () => void }) {
  return <div className="text-center py-16 space-y-10 animate-in zoom-in duration-700">
    <div className="w-24 h-24 bg-emerald-400/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-400/20 border border-emerald-400/30"><CheckCircle size={48} /></div>
    <div className="space-y-3">
      <h2 className="text-4xl font-black text-white tracking-tighter uppercase">{submittedRecordType === "clean_place" ? "Lieu propre signalé" : "Pollution signalée"}</h2>
      <p className="cmm-text-body cmm-text-inverse font-medium">{submittedRecordType === "clean_place" ? "La preuve du lieu propre est en cours de traitement par le cockpit." : "Le signalement de pollution est en cours de traitement par le cockpit."}</p>
    </div>
    <div className="pt-6 flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
      <button onClick={onReset} className="flex-1 py-6 rounded-[2rem] bg-white text-black font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-400 transition-all">Nouveau Signalement</button>
      <Link href={DASHBOARD_ROUTE} className="flex-1 py-6 rounded-[2rem] bg-white/5 border border-white/5 text-white/60 font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all text-center flex items-center justify-center">Dashboard</Link>
    </div>
    <Link href="#mes-observations" className="mx-auto inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200">Voir mes observations</Link>
  </div>;
}

function QuickSignalementPartialState({ retryPhotoUploads, isPreparingPhotos, error }: { retryPhotoUploads: () => Promise<void>; isPreparingPhotos: boolean; error: string | null }) {
  return <div className="text-center py-16 space-y-10 animate-in zoom-in duration-700">
    <div className="w-24 h-24 bg-amber-400/20 text-amber-300 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-amber-400/20 border border-amber-400/30"><AlertTriangle size={48} /></div>
    <div className="space-y-3"><h2 className="text-4xl font-black text-white tracking-tighter uppercase">Signalement créé</h2><p className="text-xl text-white/50 font-medium">Le signalement est conservé, mais une ou plusieurs preuves photo restent à transmettre.</p></div>
    <div className="pt-6 flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
      <button onClick={() => { void /* fire-and-forget -- the partial-success state owns upload retry state and errors. */ retryPhotoUploads(); }} disabled={isPreparingPhotos} className="flex-1 py-6 rounded-[2rem] bg-amber-300 text-black font-black text-xs uppercase tracking-[0.2em] hover:bg-amber-200 transition-all disabled:opacity-50">{isPreparingPhotos ? "Nouvel essai..." : "Réessayer les photos"}</button>
      <Link href={DASHBOARD_ROUTE} className="flex-1 py-6 rounded-[2rem] bg-white/5 border border-white/5 text-white/60 font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all text-center flex items-center justify-center">Continuer</Link>
    </div>
    <Link href="#mes-observations" className="mx-auto inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200">Voir mes observations</Link>
    {error && <p className="text-sm font-bold text-amber-200">{error}</p>}
  </div>;
}

function QuickSignalementLocationAndCategories({ isCleanPlace, locStatus, setRecordType, setError, selectedCategories, setSelectedCategories }: {
  isCleanPlace: boolean;
  locStatus: "idle" | "locating" | "success" | "error";
  setRecordType: (value: QuickSignalementRecordType) => void;
  setError: (value: string | null) => void;
  selectedCategories: WasteCategorySlug[];
  setSelectedCategories: (value: WasteCategorySlug[]) => void;
}) {
  return <>
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h3 className="text-xs font-black text-white/40 uppercase tracking-[0.3em]">01 • État observé du lieu</h3><div className="flex items-center gap-2">{locStatus === "locating" && <Loader2 className="animate-spin text-emerald-400" size={14} />}{locStatus === "success" && <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-xs font-black text-emerald-400 uppercase tracking-widest"><MapPin size={10} /> Localisé</div>}{locStatus === "error" && <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-400/10 border border-rose-400/20 text-xs font-black text-rose-400 uppercase tracking-widest"><AlertTriangle size={10} /> GPS Error</div>}</div></div>
      <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="État observé du lieu">
        <button type="button" onClick={() => { setRecordType("spot"); setError(null); }} aria-pressed={!isCleanPlace} className={`rounded-2xl border px-5 py-4 text-left transition ${!isCleanPlace ? "border-rose-300 bg-rose-400/15 text-white" : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/20"}`}><span className="block text-sm font-black">Pollution constatée</span><span className="mt-1 block text-xs font-medium text-current/65">Créer un spot à qualifier</span></button>
        <button type="button" onClick={() => { setRecordType("clean_place"); setSelectedCategories([]); setError(null); }} aria-pressed={isCleanPlace} className={`rounded-2xl border px-5 py-4 text-left transition ${isCleanPlace ? "border-emerald-300 bg-emerald-400/15 text-white" : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/20"}`}><span className="block text-sm font-black">Lieu constaté propre</span><span className="mt-1 block text-xs font-medium text-current/65">Créer une observation clean_place</span></button>
      </div>
    </div>
    <div className="space-y-6">
      <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.3em]">02 • Catégories Waste</h3>
      {isCleanPlace ? <div className="rounded-[2rem] border border-emerald-300/20 bg-emerald-400/10 p-6 text-sm font-medium text-emerald-100">Les catégories déchets sont désactivées pour un lieu constaté propre.</div> : <><WasteCategorySelector value={selectedCategories} onChange={setSelectedCategories} idPrefix="quick-signalement-waste" className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4" /><WasteFieldSummary value={selectedCategories} className="border-white/10 bg-white/[0.06] text-white" /></>}
    </div>
  </>;
}

function QuickSignalementSubmissionControls({ isCleanPlace, photos, setPhotos, error, authRequired, signInHref, signUpHref, isSubmitting, isPreparingPhotos, location, selectedCategories, handleSubmit, locStatus }: {
  isCleanPlace: boolean;
  photos: SignalementEvidenceUploadItem[];
  setPhotos: (value: SignalementEvidenceUploadItem[]) => void;
  error: string | null;
  authRequired: boolean;
  signInHref?: string;
  signUpHref?: string;
  isSubmitting: boolean;
  isPreparingPhotos: boolean;
  location: { lat: number; lng: number } | null;
  selectedCategories: WasteCategorySlug[];
  handleSubmit: () => void;
  locStatus: "idle" | "locating" | "success" | "error";
}) {
  return <>
    <div className="space-y-6">
      <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.3em]">03 • Preuve Visuelle</h3>
      <label htmlFor="quick-signalement-evidence" className="group relative flex flex-col items-center justify-center gap-6 py-12 rounded-[3rem] border-2 border-dashed border-white/10 bg-white/5 cursor-pointer transition-all duration-500 overflow-hidden hover:bg-white/10 hover:border-emerald-400/40 focus-within:outline-none focus-within:ring-2 focus-within:ring-emerald-300 focus-within:ring-offset-2 focus-within:ring-offset-emerald-950"><div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity blur-[60px]" /><div className="relative z-10 flex flex-col items-center gap-4"><div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 transition-all group-hover:border-emerald-400/20 group-hover:bg-emerald-400/10 group-hover:text-emerald-400"><Camera size={28} /></div><span className="text-xs font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-white transition-colors">{photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? "s" : ""} sélectionnée${photos.length > 1 ? "s" : ""}` : "Déposer ou capturer"}</span></div><input id="quick-signalement-evidence" aria-label="Ajouter une preuve visuelle" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { const nextFiles = Array.from(event.target.files || []).slice(0, 3).map(createSignalementEvidenceUploadItem); setPhotos(nextFiles); }} className="sr-only" /></label>
    </div>
    <div className="pt-8 space-y-6">
      {error ? <div className="p-5 rounded-2xl bg-rose-400/10 border border-rose-400/20 text-rose-400 text-xs font-bold text-center animate-shake">{error}</div> : null}
      {authRequired ? <div className="flex flex-wrap justify-center gap-3 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4 text-center">{signInHref ? <Link href={signInHref} className="rounded-xl bg-emerald-300 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-950">Se connecter et reprendre</Link> : null}{signUpHref ? <Link href={signUpHref} className="rounded-xl border border-emerald-200/40 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-100">Créer un compte</Link> : null}</div> : null}
      <button onClick={handleSubmit} disabled={(!isCleanPlace && selectedCategories.length === 0) || !location || isSubmitting || isPreparingPhotos} className="group relative w-full overflow-hidden rounded-[2.5rem] bg-emerald-500 p-8 text-black transition-all hover:bg-emerald-400 disabled:opacity-20 disabled:grayscale shadow-2xl shadow-emerald-500/20"><div className="relative z-10 flex items-center justify-center gap-4">{isSubmitting || isPreparingPhotos ? <><Loader2 className="animate-spin" size={20} /><span className="text-xs font-black uppercase tracking-[0.3em]">{isPreparingPhotos ? "Préparation des photos..." : "Transmission..."}</span></> : <><span className="text-xs font-black uppercase tracking-[0.3em]">{isCleanPlace ? "Signaler le lieu propre" : "Signaler la pollution"}</span><ArrowRight size={18} className="transition-transform group-hover:translate-x-2" /></>}</div></button>
      {locStatus !== "success" && !isSubmitting && !isPreparingPhotos ? <p className="text-center text-xs font-black text-rose-400/60 uppercase tracking-[0.3em] animate-pulse">Acquisition du signal GPS requise...</p> : null}
    </div>
  </>;
}

type QuickSignalementSubmissionParams = {
  isCleanPlace: boolean;
  selectedCategories: WasteCategorySlug[];
  location: { lat: number; lng: number } | null;
  isAuthenticated: boolean;
  recordType: QuickSignalementRecordType;
  photos: SignalementEvidenceUploadItem[];
  onSignalementCreated?: () => void;
  acquire: () => boolean;
  release: () => void;
  setError: Dispatch<SetStateAction<string | null>>;
  setAuthRequired: Dispatch<SetStateAction<boolean>>;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
  setSubmittedSignalementId: Dispatch<SetStateAction<string | null>>;
  setSubmittedRecordType: Dispatch<SetStateAction<QuickSignalementRecordType>>;
  setIsPreparingPhotos: Dispatch<SetStateAction<boolean>>;
  setPendingPhotoUploads: Dispatch<SetStateAction<SignalementEvidenceUploadItem[]>>;
  setIsPartialSuccess: Dispatch<SetStateAction<boolean>>;
  setIsSuccess: Dispatch<SetStateAction<boolean>>;
};

async function executeQuickSignalementSubmission(params: QuickSignalementSubmissionParams): Promise<void> {
  if ((!params.isCleanPlace && params.selectedCategories.length === 0) || !params.location) return;
  if (!params.isAuthenticated) {
    try {
      window.sessionStorage.setItem(PENDING_DRAFT_STORAGE_KEY, serializeQuickSignalementDraft({ recordType: params.recordType, selectedCategories: params.selectedCategories }));
    } catch {
      // Local resume data is optional; the authentication CTA remains usable.
    }
    params.setAuthRequired(true);
    params.setError("Connectez-vous pour transmettre cette observation. Vos choix préparés restent sur cet appareil.");
    return;
  }
  if (!params.acquire()) {
    params.setError("Un signalement est déjà en cours. Réessayez dans un instant.");
    return;
  }
  params.setIsSubmitting(true);
  params.setError(null);
  try {
    const created = await createAction(buildQuickSignalementPayload({ recordType: params.recordType, categories: params.selectedCategories, location: params.location, actionDate: new Date().toISOString().split("T")[0] }));
    params.setSubmittedSignalementId(created.id);
    try {
      window.sessionStorage.removeItem(PENDING_DRAFT_STORAGE_KEY);
    } catch {
      // Ignore cleanup failures after a successful server mutation.
    }
    params.setSubmittedRecordType(params.recordType);
    params.onSignalementCreated?.();
    if (params.photos.length > 0) {
      params.setIsPreparingPhotos(true);
      const uploadResult = await uploadSignalementEvidence(created.id, params.photos);
      if (uploadResult.failed.length > 0) {
        params.setPendingPhotoUploads(uploadResult.failed.map((failure) => failure.item));
        params.setIsPartialSuccess(true);
        params.setError(`${uploadResult.failed.length} preuve${uploadResult.failed.length > 1 ? "s" : ""} photo n'a pas pu être transmise.`);
      } else {
        params.setIsSuccess(true);
      }
    } else {
      params.setIsSuccess(true);
    }
  } catch (err) {
    logFailure("QuickSignalement", "Submission failed", err, { selectedCategories: params.selectedCategories, hasLocation: Boolean(params.location) });
    params.setError("Transmission échouée. Vérifiez votre GPS et réessayez.");
  } finally {
    params.setIsPreparingPhotos(false);
    params.setIsSubmitting(false);
    params.release();
  }
}

export function TrashSpotterObservationForm({
  initialLocation = null,
  onSignalementCreated,
  isAuthenticated = true,
  signInHref,
  signUpHref,
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
  const [authRequired, setAuthRequired] = useState(false);
  const { acquire, release } = useSubmissionLock();
  const isCleanPlace = recordType === "clean_place";

  useQuickSignalementLocation({ initialLocation, setRecordType, setSelectedCategories, setLocation, setLocStatus });

  const handleSubmit = () => {
    void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ executeQuickSignalementSubmission({
      isCleanPlace,
      selectedCategories,
      location,
      isAuthenticated,
      recordType,
      photos,
      onSignalementCreated,
      acquire,
      release,
      setError,
      setAuthRequired,
      setIsSubmitting,
      setSubmittedSignalementId,
      setSubmittedRecordType,
      setIsPreparingPhotos,
      setPendingPhotoUploads,
      setIsPartialSuccess,
      setIsSuccess,
    });
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
    return <QuickSignalementSuccessState submittedRecordType={submittedRecordType} onReset={() => {
      setIsSuccess(false);
      setIsPartialSuccess(false);
      setRecordType("spot");
      setSelectedCategories([]);
      setPhotos([]);
      setPendingPhotoUploads([]);
      setSubmittedSignalementId(null);
    }} />;
  }

  if (isPartialSuccess) {
    return <QuickSignalementPartialState retryPhotoUploads={retryPhotoUploads} isPreparingPhotos={isPreparingPhotos} error={error} />;
  }

   return (
     <div className="space-y-12">
        <QuickSignalementLocationAndCategories
          isCleanPlace={isCleanPlace}
          locStatus={locStatus}
          setRecordType={setRecordType}
          setError={setError}
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
        />

        <QuickSignalementSubmissionControls
          isCleanPlace={isCleanPlace}
          photos={photos}
          setPhotos={(nextPhotos) => { setPhotos(nextPhotos); setError(null); }}
          error={error}
          authRequired={authRequired}
          signInHref={signInHref}
          signUpHref={signUpHref}
          isSubmitting={isSubmitting}
          isPreparingPhotos={isPreparingPhotos}
          location={location}
          selectedCategories={selectedCategories}
          handleSubmit={handleSubmit}
          locStatus={locStatus}
        />
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Camera, MapPin, CheckCircle, AlertTriangle, Loader2, ArrowRight } from "lucide-react";
import { createAction } from "@/lib/actions/http";
import { normalizeActionPhotos } from "@/lib/actions/vision";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSubmissionLock } from "@/hooks/use-submission-lock";
import { DASHBOARD_ROUTE } from "@/lib/accueil-pilotage-routes";

const WASTE_TYPES = [
  { id: "megots", label: "Mégots", icon: "🚬", color: "amber" },
  { id: "plastique", label: "Plastique", icon: "🥤", color: "blue" },
  { id: "encombrant", label: "Encombrant", icon: "🛋️", color: "rose" },
  { id: "mixte", label: "Mixte", icon: "🥡", color: "emerald" },
];

export function QuickSignalementForm() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<"idle" | "locating" | "success" | "error">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreparingPhotos, setIsPreparingPhotos] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { acquire, release } = useSubmissionLock();

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      setLocStatus("locating");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocStatus("success");
        },
        () => setLocStatus("error"),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  const handleSubmit = async () => {
    if (!selectedType || !location) return;
    if (!acquire()) {
      setError("Un signalement est déjà en cours. Réessayez dans un instant.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      setIsPreparingPhotos(true);
      const photoAssets = photos.length > 0 ? await normalizeActionPhotos(photos.slice(0, 3)) : [];
      await createAction({
        actionDate: new Date().toISOString().split("T")[0],
        locationLabel: `Signalement Rapide (${selectedType})`,
        latitude: location.lat,
        longitude: location.lng,
        wasteKg: 0,
        cigaretteButts: 0,
        volunteersCount: 1,
        durationMinutes: 0,
        submissionMode: "quick",
        recordType: "spot",
        notes: `Signalement mobile express pour type: ${selectedType}`,
        photos: photoAssets,
      });
      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      setError("Transmission échouée. Vérifiez votre GPS et réessayez.");
    } finally {
      setIsPreparingPhotos(false);
      setIsSubmitting(false);
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
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Signalement Transmis</h2>
          <p className="text-xl text-white/30 font-medium">L&apos;information est en cours de traitement par le cockpit.</p>
        </div>
        <div className="pt-6 flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
          <button 
            onClick={() => { setIsSuccess(false); setSelectedType(null); }}
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
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.3em]">01 • Nature du déchet</h3>
          <div className="flex items-center gap-2">
            {locStatus === "locating" && <Loader2 className="animate-spin text-emerald-400" size={14} />}
            {locStatus === "success" && <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest"><MapPin size={10} /> Localisé</div>}
            {locStatus === "error" && <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-400/10 border border-rose-400/20 text-[9px] font-black text-rose-400 uppercase tracking-widest"><AlertTriangle size={10} /> GPS Error</div>}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {WASTE_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={cn(
                "group flex flex-col items-center justify-center gap-4 p-8 rounded-[2.5rem] border transition-all duration-500",
                selectedType === type.id 
                  ? "bg-white border-white scale-95 shadow-2xl" 
                  : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
              )}
            >
              <span className="text-4xl transition-transform group-hover:scale-110 duration-500">{type.icon}</span>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest transition-colors",
                selectedType === type.id ? "text-black" : "text-white/40"
              )}>
                {type.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.3em]">02 • Preuve Visuelle</h3>
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
              const nextFiles = Array.from(event.target.files || []).slice(0, 3);
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
          disabled={!selectedType || !location || isSubmitting || isPreparingPhotos}
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
                <span className="text-xs font-black uppercase tracking-[0.3em]">Valider le signalement</span>
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

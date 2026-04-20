"use client";

import { useState, useEffect } from "react";
import { Camera, MapPin, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { createAction } from "@/lib/actions/http";
import Link from "next/link";

const WASTE_TYPES = [
  { id: "megots", label: "Mégots", icon: "🚬", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { id: "plastique", label: "Plastique", icon: "🥤", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "encombrant", label: "Encombrant", icon: "🛋️", color: "bg-rose-100 text-rose-700 border-rose-200" },
  { id: "mixte", label: "Mixte", icon: "🥡", color: "bg-slate-100 text-slate-700 border-slate-200" },
];

export function QuickSignalementForm() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<"idle" | "locating" | "success" | "error">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Auto-locate on mount
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

    setIsSubmitting(true);
    try {
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
      });
      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Erreur lors du signalement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-10 space-y-6 animate-in zoom-in duration-500">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-100">
          <CheckCircle size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">Merci !</h2>
          <p className="text-slate-500">Votre signalement a été enregistré avec succès.</p>
        </div>
        <div className="pt-4 flex flex-col gap-3">
          <button 
            onClick={() => { setIsSuccess(false); setSelectedType(null); }}
            className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black text-lg hover:bg-emerald-700 transition"
          >
            SIGNALER AUTRE CHOSE
          </button>
          <Link 
            href="/dashboard"
            className="w-full py-4 rounded-2xl bg-slate-100 text-slate-700 font-black text-lg hover:bg-slate-200 transition"
          >
            RETOUR DASHBOARD
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">1. Choisissez le type</h3>
          {locStatus === "locating" && <Loader2 className="animate-spin text-emerald-500" size={18} />}
          {locStatus === "success" && <MapPin className="text-emerald-500" size={18} />}
          {locStatus === "error" && <AlertTriangle className="text-rose-500" size={18} />}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {WASTE_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] border-4 transition-all duration-300 ${
                selectedType === type.id 
                  ? "border-emerald-500 ring-4 ring-emerald-100 scale-95" 
                  : `${type.color} border-transparent hover:border-slate-200`
              }`}
            >
              <span className="text-4xl">{type.icon}</span>
              <span className="font-black uppercase tracking-wider text-xs">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">2. Photo (Optionnel)</h3>
        <label className="flex flex-col items-center justify-center gap-4 py-8 rounded-[2rem] border-4 border-dashed border-slate-200 bg-slate-50 text-slate-500 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
          <Camera size={32} />
          <span className="text-sm font-bold">PRENDRE UNE PHOTO</span>
          <input type="file" accept="image/*" className="hidden" />
        </label>
      </div>

      <div className="pt-6">
        <button
          onClick={handleSubmit}
          disabled={!selectedType || !location || isSubmitting}
          className="w-full py-5 rounded-[2rem] bg-slate-900 text-white font-black text-xl shadow-2xl flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale transition-all hover:scale-[1.02] active:scale-95"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" />
              ENVOI...
            </>
          ) : (
            "ENVOYER LE SIGNALEMENT"
          )}
        </button>
        {locStatus !== "success" && !isSubmitting && (
          <p className="text-center mt-4 text-xs font-bold text-rose-500 uppercase tracking-widest animate-pulse">
            En attente de position GPS...
          </p>
        )}
      </div>
    </div>
  );
}

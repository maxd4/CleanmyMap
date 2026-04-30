"use client";

import { useRef, useState } from"react";
import useSWR from"swr";
import { toPng } from"html-to-image";
import confetti from"canvas-confetti";
import { Download, Share2, ArrowLeft } from"lucide-react";
import Link from"next/link";
import { ImpactCard } from"@/components/profil/impact-card";
import { ClerkRequiredGate } from"@/components/ui/clerk-required-gate";
import { useUser } from"@clerk/nextjs";
import { useSitePreferences } from"@/components/ui/site-preferences-provider";
import { CognitiveCueStrip } from"@/components/learn/cognitive-cue-strip";

type ImpactPageProgression = {
 currentLevel: number;
 dynamicRanking?: {
  rank: number | null;
 };
 impact?: {
  wasteKg?: number;
  totalButts?: number;
  waterSavedLiters?: number;
 };
 badges?: string[];
};

type GamificationMeResponse = {
 status: "ok";
 progression: ImpactPageProgression | null;
};

async function fetchJson<T>(url: string): Promise<T> {
 const response = await fetch(url);
 if (!response.ok) throw new Error("API Error");
 return response.json();
}

export default function ImpactProfilePage() {
 const { user } = useUser();
 const { locale } = useSitePreferences();
 const cardRef = useRef<HTMLDivElement>(null);
 const [isExporting, setIsExporting] = useState(false);

 const { data: meData, isLoading } = useSWR<GamificationMeResponse>(
  "gamification-me",
  () => fetchJson<GamificationMeResponse>("/api/gamification/me"),
 );

 const handleDownload = async () => {
 if (!cardRef.current) return;
 setIsExporting(true);
 try {
 const dataUrl = await toPng(document.getElementById("impact-card")!, { 
 cacheBust: true,
 backgroundColor:"#064e3b" // Emerald-900 background for export
 });
 const link = document.createElement("a");
 link.download = `CleanMyMap-Impact-${user?.firstName ||"Contributeur"}.png`;
 link.href = dataUrl;
 link.click();
 confetti({
 particleCount: 100,
 spread: 70,
 origin: { y: 0.6 },
 colors: ["#10b981","#34d399","#ffffff"]
 });
 } catch (err) {
 console.error("Export failed", err);
 } finally {
 setIsExporting(false);
 }
 };

 if (isLoading) return <div className="flex items-center justify-center min-h-[400px]">Chargement de votre impact...</div>;

 const prog = meData?.progression;
 const impactQuestion =
 locale === "fr"
 ? "Quelle évolution mérite d’être retenue aujourd’hui ?"
 : "Which change deserves to be remembered today?";
 const impactClue =
 locale === "fr"
 ? "La carte d'impact consolide ce qui a déjà bougé et signale ce qui reste à revoir."
 : "The impact card consolidates what has already changed and signals what still needs review.";

 if (!user) {
 return (
 <ClerkRequiredGate
 isAuthenticated={false}
 mode="blur"
 title="Carte d'impact personnelle"
 description="Connectez-vous pour consulter, télécharger et partager votre carte d'impact."
 lockedPreview={
 <div className="grid gap-6 md:grid-cols-2">
 <div className="md:col-span-2">
 <CognitiveCueStrip
  locale={locale}
  rubricId="impact"
  question={impactQuestion}
  clue={impactClue}
  chips={[
   locale === "fr" ? "Progression de maîtrise" : "Mastery progression",
   locale === "fr" ? "Maîtrisées" : "Mastered",
   locale === "fr" ? "À revoir" : "To review",
  ]}
 />
 </div>
 <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
 Aperçu
 </p>
 <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
 <p className="cmm-text-small cmm-text-secondary">
 La carte d&apos;impact montre tes actions validées, ton niveau et
 tes badges après connexion.
 </p>
 </div>
 </div>
 <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
 Actions
 </p>
 <div className="mt-3 space-y-3">
 <div className="rounded-2xl border border-slate-200 bg-white p-4 cmm-text-small cmm-text-secondary">
 Télécharger le certificat
 </div>
 <div className="rounded-2xl border border-slate-200 bg-white p-4 cmm-text-small cmm-text-secondary">
 Copier le lien du profil
 </div>
 <div className="rounded-2xl border border-slate-200 bg-white p-4 cmm-text-small cmm-text-secondary">
 Consulter la méthodologie
 </div>
 </div>
 </div>
 </div>
 }
 >
 <div />
 </ClerkRequiredGate>
 );
 }

 return (
 <div className="w-full space-y-8 pb-12">
 <header className="flex items-center justify-between">
 <Link href="/dashboard" className="flex items-center gap-2 cmm-text-small font-bold cmm-text-muted hover:cmm-text-primary transition">
 <ArrowLeft size={16} /> Retour au tableau de bord
 </Link>
 <h1 className="text-xl font-bold uppercase tracking-tighter">Carte d&apos;impact personnelle</h1>
 </header>

 <div className="grid grid-cols-1 gap-12 items-center xl:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
 {/* Visual Preview */}
 <div className="flex justify-center">
 <ImpactCard 
 userName={user?.fullName ||"Contributeur anonyme"}
 level={prog?.currentLevel || 1}
 rank={prog?.dynamicRanking?.rank ?? null}
 totalKg={prog?.impact?.wasteKg || 0}
 totalButts={prog?.impact?.totalButts || 0}
 waterSaved={prog?.impact?.waterSavedLiters || 0}
 topBadges={prog?.badges || []}
 />
 </div>

 {/* Actions & Info */}
 <div className="space-y-6">
 <CognitiveCueStrip
  locale={locale}
  rubricId="impact"
  question={impactQuestion}
  clue={impactClue}
  chips={[
   locale === "fr" ? "Progression de maîtrise" : "Mastery progression",
   locale === "fr" ? "Maîtrisées" : "Mastered",
   locale === "fr" ? "À revoir" : "To review",
  ]}
  action={{
   href: "/reports",
   label: locale === "fr" ? "Ouvrir les rapports" : "Open reports",
  }}
 />

 <div className="space-y-2">
 <h2 className="text-3xl font-bold cmm-text-primary leading-tight">Suivez votre impact terrain.</h2>
 <p className="cmm-text-secondary">Générez une carte claire qui résume vos actions validées, votre niveau et vos badges.</p>
 </div>

 <div className="flex flex-col gap-3">
 <button 
 onClick={handleDownload}
 disabled={isExporting}
 className="flex items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-8 py-4 cmm-text-small font-bold text-white shadow-xl shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
 >
 <Download size={18} /> {isExporting ?"Génération en cours..." :"Télécharger la carte PNG"}
 </button>
 <button className="flex items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-8 py-4 cmm-text-small font-bold cmm-text-secondary transition hover:bg-slate-50">
 <Share2 size={18} /> Copier le lien du profil
 </button>
 </div>

 <div className="rounded-2xl bg-slate-100 p-6 space-y-4">
 <p className="cmm-text-caption font-bold uppercase tracking-wider cmm-text-muted">Méthode</p>
 <p className="cmm-text-caption cmm-text-muted leading-relaxed">
 Les données d&apos;impact sont consolidées à partir de vos actions validées. Le volume d&apos;eau préservé repose sur 500L par mégot extrait.
 </p>
 <Link href="/methodologie" className="block cmm-text-caption font-bold uppercase tracking-widest text-emerald-600 hover:underline">
 Consulter le protocole scientifique →
 </Link>
 </div>
 </div>
 </div>
 </div>
 );
}

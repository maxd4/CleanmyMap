"use client";

import { useEffect, useMemo, useState } from"react";
import {
 buildDeliverableBaseName,
 normalizeDeliverableRubrique,
} from"@/lib/reports/deliverable-name";

type RubriquePdfExportButtonProps = {
 rubriqueTitle: string;
 targetSelector?: string;
};

type ExportHistoryEntry = {
 id: string;
 rubrique: string;
 filename: string;
 generatedAt: string;
};

const STORAGE_KEY ="cleanmymap.rubrique_export_history.v1";
const MAX_HISTORY = 12;

function escapeHtml(value: string): string {
 return value
 .replaceAll("&","&amp;")
 .replaceAll("<","&lt;")
 .replaceAll(">","&gt;")
 .replaceAll('"',"&quot;")
 .replaceAll("'","&#39;");
}

function collectHeadStyles(): string {
 return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
 .map((node) => node.outerHTML)
 .join("\n");
}

function readHistoryFromStorage(): ExportHistoryEntry[] {
 if (typeof window ==="undefined") {
 return [];
 }
 try {
 const raw = window.localStorage.getItem(STORAGE_KEY);
 if (!raw) {
 return [];
 }
 const parsed = JSON.parse(raw) as ExportHistoryEntry[];
 if (!Array.isArray(parsed)) {
 return [];
 }
 return parsed
 .filter((item) => item && typeof item ==="object")
 .filter(
 (item) =>
 typeof item.id ==="string" &&
 typeof item.rubrique ==="string" &&
 typeof item.filename ==="string" &&
 typeof item.generatedAt ==="string",
 )
 .slice(0, MAX_HISTORY);
 } catch {
 return [];
 }
}

function writeHistoryToStorage(entries: ExportHistoryEntry[]): void {
 try {
 window.localStorage.setItem(
 STORAGE_KEY,
 JSON.stringify(entries.slice(0, MAX_HISTORY)),
 );
 } catch {
 // ignore storage errors
 }
}

export function RubriquePdfExportButton({
 rubriqueTitle,
 targetSelector ="[data-rubrique-report-root]",
}: RubriquePdfExportButtonProps) {
 const [state, setState] = useState<"idle" |"pending" |"error">("idle");
 const [message, setMessage] = useState<string | null>(null);
 const [customRubrique, setCustomRubrique] = useState<string>("");
 const [history, setHistory] = useState<ExportHistoryEntry[]>(() =>
 readHistoryFromStorage(),
 );

 const rubriqueSlug = useMemo(
 () => normalizeDeliverableRubrique(customRubrique.trim() || rubriqueTitle),
 [customRubrique, rubriqueTitle],
 );
 const filename = useMemo(
 () => `${buildDeliverableBaseName({ rubrique: rubriqueSlug })}.pdf`,
 [rubriqueSlug],
 );

 useEffect(() => {
 writeHistoryToStorage(history);
 }, [history]);

 function exportRubriquePdf() {
 setState("pending");
 setMessage(null);

 const printWindow = window.open("","_blank","noopener,noreferrer");
 if (!printWindow) {
 setState("error");
 setMessage("Autorise les popups pour generer le PDF.");
 return;
 }

 const target = document.querySelector<HTMLElement>(targetSelector);
 if (!target) {
 printWindow.close();
 setState("error");
 setMessage("Contenu de rubrique introuvable.");
 return;
 }

 const clonedTarget = target.cloneNode(true) as HTMLElement;
 clonedTarget
 .querySelectorAll('[data-print-ignore="true"]')
 .forEach((node) => node.remove());

 const safeTitle = escapeHtml(rubriqueTitle);
 const generatedAt = new Intl.DateTimeFormat("fr-FR", {
 dateStyle:"medium",
 timeStyle:"short",
 }).format(new Date());
 const styles = collectHeadStyles();
 const fullFilename = filename.toLowerCase();

 const createdAtIso = new Date().toISOString();
 setHistory((previous) =>
 [
 {
 id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
 rubrique: rubriqueSlug,
 filename: fullFilename,
 generatedAt: createdAtIso,
 },
 ...previous,
 ].slice(0, MAX_HISTORY),
 );

 const html = `<!doctype html>
<html lang="fr">
 <head>
 <meta charset="utf-8" />
 <title>${escapeHtml(fullFilename)}</title>
 ${styles}
 <style>
 @page { size: A4; margin: 14mm; }
 body { background: #ffffff; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
 .rubrique-print-header {
 margin-bottom: 16px;
 border: 1px solid #cbd5e1;
 border-radius: 18px;
 padding: 14px 16px;
 background: linear-gradient(135deg, #0f4c5c 0%, #1f5d7f 100%);
 color: #f8fafc;
 }
 .rubrique-print-header .rubrique-print-brand {
 display: flex;
 align-items: center;
 gap: 10px;
 }
 .rubrique-print-header .rubrique-print-brand img {
 height: 26px;
 width: auto;
 }
 .rubrique-print-header h1 { margin: 0; font-size: 22px; line-height: 1.15; }
 .rubrique-print-header p { margin: 4px 0 0; color: rgba(248, 250, 252, 0.92); font-size: 12px; }
 .rubrique-print-header .rubrique-print-meta {
 display: flex;
 flex-wrap: wrap;
 gap: 8px;
 margin-top: 10px;
 font-size: 11px;
 }
 .rubrique-print-header .rubrique-print-meta span {
 border: 1px solid rgba(255,255,255,0.18);
 background: rgba(255,255,255,0.08);
 border-radius: 999px;
 padding: 4px 8px;
 }
 .rubrique-print-note {
 margin: 0 0 14px;
 padding: 10px 12px;
 border-radius: 14px;
 border: 1px solid #dbeafe;
 background: #eff6ff;
 color: #1e3a8a;
 font-size: 12px;
 }
 section, article, table, .rounded-2xl, .rounded-3xl { break-inside: avoid; }
 [data-print-ignore="true"] { display: none !important; }
 </style>
 </head>
 <body>
 <header class="rubrique-print-header">
 <div class="rubrique-print-brand">
 <img src="/brand/logo-cleanmymap-officiel.svg" alt="Logo CleanMyMap" />
 </div>
 <h1>${safeTitle}</h1>
 <p>Generation: ${escapeHtml(generatedAt)} | Rubrique: ${escapeHtml(rubriqueSlug)} | Fichier suggere: ${escapeHtml(fullFilename)}</p>
 <div class="rubrique-print-meta">
 <span>Document officiel</span>
 <span>Lecture décideur</span>
 <span>Version print-friendly</span>
 </div>
 </header>
 <p class="rubrique-print-note">Ce livrable privilégie la preuve utile à la décision: sources, méthode, lecture territoriale et actions exploitables.</p>
 ${clonedTarget.outerHTML}
 <script>
 window.addEventListener("afterprint", () => window.close());
 window.addEventListener("load", () => {
 setTimeout(() => window.print(), 180);
 });
 </script>
 </body>
</html>`;

 printWindow.document.open();
 printWindow.document.write(html);
 printWindow.document.close();
 printWindow.focus();
 setState("idle");
 }

 return (
 <div data-print-ignore="true" className="flex flex-col gap-3 min-w-80 w-full max-w-sm">
 <div className="w-full rounded-[1.5rem] border border-white/60 bg-white/70 backdrop-blur-xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
 {/* Decorative Icon BG */}
 <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
 </div>
 
 <p className="cmm-text-caption font-bold uppercase tracking-widest text-emerald-600 mb-3 flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
 Génération Livrable PDF
 </p>
 
 <div className="space-y-1 mb-4">
 <p className="cmm-text-caption cmm-text-muted flex justify-between">
 <span>Rubrique:</span> <span className="font-bold cmm-text-primary">{rubriqueSlug}</span>
 </p>
 <p className="cmm-text-caption cmm-text-muted flex justify-between truncate">
 <span>Fichier:</span> <span className="font-mono bg-slate-100 px-1.5 rounded cmm-text-caption cmm-text-secondary">{filename.toLowerCase()}</span>
 </p>
 </div>
 
 <label className="block cmm-text-caption font-bold cmm-text-secondary mb-1">
 Renommer la rubrique (Optionnel)
 </label>
 <input
 type="text"
 value={customRubrique}
 onChange={(event) => setCustomRubrique(event.target.value)}
 placeholder="ex: audits, q3_report..."
 className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 cmm-text-caption cmm-text-primary outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner mb-4"
 />

 <button
 type="button"
 onClick={exportRubriquePdf}
 disabled={state ==="pending"}
 className="w-full relative overflow-hidden group rounded-xl bg-slate-900 px-4 py-3 cmm-text-small font-bold text-white transition-all hover:bg-slate-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
 >
 <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/20 to-emerald-500/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
 <span className="relative flex items-center justify-center gap-2">
 {state ==="pending" ?"Préparation du document..." :"Générer le rapport officiel"}
 </span>
 </button>
 {message ? <p className="mt-2 cmm-text-caption font-bold text-rose-500 bg-rose-50 p-2 rounded-lg border border-rose-100 text-center">{message}</p> : null}
 </div>

 {history.length > 0 ? (
 <div className="w-full rounded-[1.5rem] border border-slate-200/60 bg-white/50 backdrop-blur-md p-4">
 <p className="cmm-text-caption font-bold uppercase tracking-widest cmm-text-muted mb-3 ml-1">
 Historique 
 </p>
 <ul className="space-y-2">
 {history.slice(0, 4).map((item) => (
 <li key={item.id} className="flex flex-col gap-0.5 cmm-text-caption bg-white p-2 rounded-xl border border-slate-100 shadow-sm hover:border-emerald-200 transition-colors">
 <span className="font-mono font-bold cmm-text-secondary truncate">{item.filename}</span>
 <div className="flex justify-between cmm-text-muted">
 <span className="uppercase tracking-wide">{item.rubrique}</span>
 <span>{new Intl.DateTimeFormat("fr-FR", { dateStyle:"short", timeStyle:"short" }).format(new Date(item.generatedAt))}</span>
 </div>
 </li>
 ))}
 </ul>
 </div>
 ) : null}
 </div>
 );
}

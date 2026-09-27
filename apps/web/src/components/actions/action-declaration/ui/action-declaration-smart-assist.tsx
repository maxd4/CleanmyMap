import type { GpsStatus } from "../hooks/use-action-declaration-smart-assist";

export function ActionDeclarationLocationAssist({
 gpsStatus,
 gpsMessage,
 onAutofillGps,
}: {
 gpsStatus: GpsStatus;
 gpsMessage: string | null;
 onAutofillGps: () => void;
}) {
 return (
 <div className="flex items-center gap-2">
 <button
 type="button"
 className="rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-2 cmm-text-small font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"
 onClick={onAutofillGps}
 disabled={gpsStatus ==="locating"}
 >
 {gpsStatus ==="locating" ?"Recherche..." :"Ma position"}
 </button>
 {gpsMessage && (
 <span
 className={`cmm-text-caption ${
 gpsStatus ==="error"
 ?"text-rose-700"
 : gpsStatus ==="success"
 ?"text-emerald-700"
 :"cmm-text-muted"
 }`}
 >
 {gpsMessage}
 </span>
 )}
 </div>
 );
}

export function ActionDeclarationWasteAssist({
 estimatedWasteKg,
 estimatedWasteKgInterval,
 suggestionLabel ="Suggestion",
}: {
 estimatedWasteKg: number;
 estimatedWasteKgInterval: [number, number] | null;
 suggestionLabel?: string;
}) {
 return (
 <div className="rounded-lg bg-slate-100 px-3 py-2 cmm-text-caption cmm-text-secondary">
 <span className="font-semibold">{suggestionLabel}:</span> {estimatedWasteKg.toFixed(1)} kg
 {estimatedWasteKgInterval && (
 <span className="ml-1 cmm-text-muted">
 ({estimatedWasteKgInterval[0].toFixed(1)}-{estimatedWasteKgInterval[1].toFixed(1)})
 </span>
 )}
 </div>
 );
}

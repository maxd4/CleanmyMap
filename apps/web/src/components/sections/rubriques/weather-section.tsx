"use client";

import { useEffect, useMemo, useState } from"react";
import Link from"next/link";
import useSWR from"swr";
import { fetchMapActions } from"@/lib/actions/http";
import {
 buildInterventionWindows,
 evaluateWeatherRisk,
 OPERATIONAL_ZONES,
 zoneForArea,
} from"@/lib/weather/ops-weather";
import { swrRecentViewOptions } from"@/lib/swr-config";
import { extractArrondissement, formatDateTimeShort } from"@/components/sections/rubriques/helpers";
import { useSitePreferences } from"@/components/ui/site-preferences-provider";
import { CloudSun, ClipboardCheck } from"lucide-react";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { CmmCard } from "@/components/ui/cmm-card";

interface OpenMeteoResponse {
 current?: {
 temperature_2m?: number;
 precipitation?: number;
 wind_speed_10m?: number;
 };
 hourly?: {
 time?: string[];
 temperature_2m?: number[];
 precipitation?: number[];
 wind_speed_10m?: number[];
 };
 daily?: {
 time?: string[];
 temperature_2m_max?: number[];
 temperature_2m_min?: number[];
 precipitation_sum?: number[];
 wind_speed_10m_max?: number[];
 };
}

export function WeatherSection() {
 const { locale } = useSitePreferences();
 const fr = locale ==="fr";
 
 const [activeTab, setActiveTab] = useState<"weather" |"kit">("weather");

 const [zoneMode, setZoneMode] = useState<"auto" |"manual">("auto");
 const [manualZoneId, setManualZoneId] = useState<string>(
 OPERATIONAL_ZONES[0]?.id ??"centre",
 );
 const [activePeriod, setActivePeriod] = useState<"now" |"j13" |"j7">("now");

 const zonesActivity = useSWR(["section-weather-zone-activity"], () =>
 fetchMapActions({ status:"approved", days: 120, limit: 260 }),
 );

 const inferredZoneId = useMemo(() => {
 const counters = new Map<string, number>();
 for (const item of zonesActivity.data?.items ?? []) {
 const area = extractArrondissement(item.location_label ||"");
 const zone = zoneForArea(area);
 if (!zone) continue;
 counters.set(zone.id, (counters.get(zone.id) ?? 0) + 1);
 }
 const inferred = [...counters.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
 return inferred ?? OPERATIONAL_ZONES[0]?.id ??"centre";
 }, [zonesActivity.data?.items]);

 const selectedZoneId = zoneMode ==="auto" ? inferredZoneId : manualZoneId;

 const selectedZone = useMemo(
 () => OPERATIONAL_ZONES.find((zone) => zone.id === selectedZoneId) ?? OPERATIONAL_ZONES[0],
 [selectedZoneId],
 );

 const { data, isLoading, error } = useSWR(
 ["section-weather-zone", selectedZone.id],
 async () => {
 const query = new URLSearchParams({
 latitude: String(selectedZone.latitude),
 longitude: String(selectedZone.longitude),
 timezone:"Europe/Paris",
 forecast_days:"8",
 current:"temperature_2m,precipitation,wind_speed_10m",
 hourly:"temperature_2m,precipitation,wind_speed_10m",
 daily:"temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
 });
 const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query.toString()}`, { cache:"no-store" });
 if (!response.ok) throw new Error("weather_unavailable");
 return (await response.json()) as OpenMeteoResponse;
 },
 swrRecentViewOptions,
 );

 const hourlyPoints = useMemo(() => {
 const times = data?.hourly?.time ?? [];
 return times.map((time, index) => ({
 time,
 temperature: Number(data?.hourly?.temperature_2m?.[index] ?? 0),
 rain: Number(data?.hourly?.precipitation?.[index] ?? 0),
 wind: Number(data?.hourly?.wind_speed_10m?.[index] ?? 0),
 }));
 }, [data]);

 const nowcasting = hourlyPoints.slice(0, 6);
 const windows = useMemo(() => buildInterventionWindows(hourlyPoints), [hourlyPoints]);

 const currentRisk = useMemo(() => {
 const point = nowcasting[0];
 return evaluateWeatherRisk({
 temperature: Number(data?.current?.temperature_2m ?? point?.temperature ?? 0),
 rain: Number(data?.current?.precipitation ?? point?.rain ?? 0),
 wind: Number(data?.current?.wind_speed_10m ?? point?.wind ?? 0),
 });
 }, [data, nowcasting]);

 const j13 = useMemo(() => {
 return (data?.daily?.time ?? []).slice(1, 4).map((day, index) => ({
 day,
 min: Number(data?.daily?.temperature_2m_min?.[index + 1] ?? 0),
 max: Number(data?.daily?.temperature_2m_max?.[index + 1] ?? 0),
 rain: Number(data?.daily?.precipitation_sum?.[index + 1] ?? 0),
 wind: Number(data?.daily?.wind_speed_10m_max?.[index + 1] ?? 0),
 }));
 }, [data]);

 const j7 = useMemo(() => {
 const times = data?.daily?.time ?? [];
 const index = times.length > 7 ? 7 : Math.max(0, times.length - 1);
 return {
 day: times[index] ??"",
 min: Number(data?.daily?.temperature_2m_min?.[index] ?? 0),
 max: Number(data?.daily?.temperature_2m_max?.[index] ?? 0),
 wind: Number(data?.daily?.wind_speed_10m_max?.[index] ?? 0),
 };
 }, [data]);

 const [packType, setPackType] = useState<"solo" |"team" |"school">("team");
 const [kitChecks, setKitChecks] = useState<Record<string, boolean>>({
 ppe: false,
 bags: false,
 tools: false,
 briefing: false,
 });
 const [kitReady, setKitReady] = useState<boolean>(false);

 const packItems = useMemo(() => {
 if (packType ==="solo") {
 return [
 fr ?"1 paire de gants" :"1 pair of gloves",
 fr ?"2 sacs différenciés" :"2 separate bags",
 fr ?"1 pince" :"1 picker",
 fr ?"1 bouteille d'eau" :"1 water bottle",
 fr ?"téléphone chargé" :"charged phone",
 ];
 }
 if (packType ==="school") {
 return [
 fr ?"20 paires de gants" :"20 pairs of gloves",
 fr ?"40 sacs différenciés" :"40 separate bags",
 fr ?"6 pinces" :"6 pickers",
 fr ?"kit signalétique" :"signage kit",
 fr ?"briefing sécurité imprimé" :"printed safety briefing",
 ];
 }
 return [
 fr ?"10 paires de gants" :"10 pairs of gloves",
 fr ?"20 sacs différenciés" :"20 separate bags",
 fr ?"4 pinces" :"4 pickers",
 fr ?"2 contenants mégots" :"2 butt containers",
 fr ?"gilet haute visibilité x5" :"5 high-visibility vests",
 ];
 }, [packType, fr]);

 const kitProgress = Math.round(
 (Object.values(kitChecks).filter(Boolean).length / Object.values(kitChecks).length) * 100,
 );

 useEffect(() => {
 if (activeTab !=="kit") return;
 let active = true;
 void fetch("/api/users/checklist-progress?checklistId=kit-main", {
 method:"GET",
 cache:"no-store",
 }).then(async (res) => {
 if (!res.ok) return;
 const payload = (await res.json()) as { entry?: { checks?: Record<string, boolean> } };
 if (active && payload.entry?.checks) {
 setKitChecks((prev) => ({ ...prev, ...payload.entry?.checks }));
 }
 }).finally(() => { if (active) setKitReady(true); });
 return () => { active = false; };
 }, [activeTab]);

 useEffect(() => {
 if (!kitReady || activeTab !=="kit") return;
 void fetch("/api/users/checklist-progress", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({ checklistId:"kit-main", checks: kitChecks }),
 }).catch(() => undefined);
 }, [kitChecks, kitReady, activeTab]);

 const riskTone = currentRisk.level ==="rouge"
 ?"border-rose-300 bg-rose-50 text-rose-900"
 : currentRisk.level ==="orange"
 ?"border-amber-300 bg-amber-50 cmm-text-primary"
 :"border-emerald-300 bg-emerald-50 cmm-text-primary";

 return (
 <div className="space-y-6">
 <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
 <button
 onClick={() => setActiveTab("weather")}
 className={`flex items-center gap-2 px-6 py-2.5 rounded-xl cmm-text-small font-bold transition ${activeTab ==="weather" ?"bg-white text-emerald-700 shadow-sm" :"cmm-text-muted hover:cmm-text-primary"}`}
 >
 <CloudSun size={18} />
 {fr ?"Météo & Risques" :"Weather & Risks"}
 </button>
 <button
 onClick={() => setActiveTab("kit")}
 className={`flex items-center gap-2 px-6 py-2.5 rounded-xl cmm-text-small font-bold transition ${activeTab ==="kit" ?"bg-white text-indigo-700 shadow-sm" :"cmm-text-muted hover:cmm-text-primary"}`}
 >
 <ClipboardCheck size={18} />
 {fr ?"Kit terrain" :"Field kit"}
 <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-200 cmm-text-caption cmm-text-secondary">{kitProgress}%</span>
 </button>
 </div>

 {activeTab ==="weather" ? (
 <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 items-start animate-in fade-in slide-in-from-bottom-2 duration-500">
 <div className="space-y-4">
 <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
 <label className="flex w-full flex-col gap-1 cmm-text-caption font-semibold uppercase tracking-wide cmm-text-secondary mb-3">
 {fr ?"Zone opérationnelle" :"Operational zone"}
 <select
 value={selectedZone.id}
 onChange={(event) => {
 setZoneMode("manual");
 setManualZoneId(event.target.value);
 }}
 className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small font-normal cmm-text-primary outline-none transition focus:border-emerald-500"
 >
 {OPERATIONAL_ZONES.map((zone) => (
 <option key={zone.id} value={zone.id}>{zone.label}</option>
 ))}
 </select>
 </label>
 <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
 <button onClick={() => setZoneMode("auto")} className={`rounded-lg border px-3 py-1.5 cmm-text-caption font-semibold transition ${zoneMode ==="auto" ?"border-slate-800 bg-slate-800 text-white" :"border-slate-300 bg-slate-50 cmm-text-secondary hover:bg-slate-100"}`}>
 {fr ?"Auto-détection" :"Auto-detect"}
 </button>
 <p className="cmm-text-caption cmm-text-muted text-right">
 {fr ?"Zone détectée" :"Detected zone"}: <span className="font-semibold">{OPERATIONAL_ZONES.find((zone) => zone.id === inferredZoneId)?.label ??"n/a"}</span>
 </p>
 </div>
 </div>

 {!isLoading && !error ? (
 <article className={`rounded-xl border shadow-sm p-4 ${riskTone}`}>
 <h3 className="cmm-text-small font-semibold uppercase tracking-wide">{fr ?"Lecture décisionnelle" :"Decision reading"}</h3>
 <div className="mt-4 flex flex-col gap-4">
 <div className="flex items-center justify-between border-b pb-3 border-emerald-900/10">
 <span className="cmm-text-caption font-semibold opacity-70 uppercase">{fr ?"Niveau de risque" :"Risk level"}</span>
 <span className="text-2xl font-bold">{currentRisk.level.toUpperCase()}</span>
 </div>
 <div>
 <p className="cmm-text-caption font-semibold opacity-70 uppercase">{fr ?"Équipement conseillé" :"Recommended gear"}</p>
 <ul className="mt-1 list-disc pl-5 cmm-text-small opacity-90 font-medium">
 {currentRisk.equipment.map((item) => <li key={item}>{item}</li>)}
 </ul>
 </div>
 <div>
 <p className="cmm-text-caption font-semibold opacity-70 uppercase">{fr ?"Contraintes" :"Constraints"}</p>
 <ul className="mt-1 list-disc pl-5 cmm-text-small opacity-90 font-medium">
 {currentRisk.constraints.map((item) => <li key={item}>{item}</li>)}
 </ul>
 </div>
 </div>
 </article>
 ) : null}
 </div>

 <div className="space-y-4">
 {!isLoading && !error ? (
 <>
 <div className="bg-slate-100 p-1.5 flex gap-1 rounded-lg w-fit">
 <button onClick={() => setActivePeriod("now")} className={`rounded-md px-4 py-1.5 cmm-text-caption font-semibold transition ${activePeriod ==="now" ?"bg-white cmm-text-primary shadow-sm" :"cmm-text-secondary hover:cmm-text-primary"}`}>0-6h (Nowcasting)</button>
 <button onClick={() => setActivePeriod("j13")} className={`rounded-md px-4 py-1.5 cmm-text-caption font-semibold transition ${activePeriod ==="j13" ?"bg-white cmm-text-primary shadow-sm" :"cmm-text-secondary hover:cmm-text-primary"}`}>J+1 à J+3</button>
 <button onClick={() => setActivePeriod("j7")} className={`rounded-md px-4 py-1.5 cmm-text-caption font-semibold transition ${activePeriod ==="j7" ?"bg-white cmm-text-primary shadow-sm" :"cmm-text-secondary hover:cmm-text-primary"}`}>Horizon J+7</button>
 </div>

 {activePeriod ==="now" && (
 <div className="grid gap-3 md:grid-cols-3">
 {nowcasting.map((point) => {
 const risk = evaluateWeatherRisk({ temperature: point.temperature, rain: point.rain, wind: point.wind });
 return (
 <article key={point.time} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-emerald-200 transition">
 <p className="font-semibold cmm-text-primary cmm-text-caption border-b border-slate-100 pb-2 mb-2">{formatDateTimeShort(point.time)}</p>
 <ul className="cmm-text-caption font-medium cmm-text-secondary space-y-1">
 <li>{point.temperature.toFixed(1)}°C | {point.rain.toFixed(1)} mm/h</li>
 <li>Vent: {point.wind.toFixed(0)} km/h</li>
 </ul>
 <p className={`mt-2 inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${risk.level === 'rouge' ? 'bg-rose-100 text-rose-700' : risk.level === 'orange' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>Risque {risk.level}</p>
 </article>
 );
 })}
 </div>
 )}

 {activePeriod ==="j13" && (
 <div className="grid gap-3 md:grid-cols-3">
 {j13.map((day) => {
 const risk = evaluateWeatherRisk({ temperature: day.max, rain: day.rain / 3, wind: day.wind });
 return (
 <article key={day.day} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-emerald-200 transition">
 <p className="font-semibold cmm-text-primary cmm-text-caption border-b border-slate-100 pb-2 mb-2">{day.day}</p>
 <ul className="cmm-text-caption font-medium cmm-text-secondary space-y-1">
 <li>{day.min.toFixed(1)} - {day.max.toFixed(1)}°C</li>
 <li>Rafales: {day.wind.toFixed(0)} km/h</li>
 </ul>
 <p className={`mt-2 inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${risk.level === 'rouge' ? 'bg-rose-100 text-rose-700' : risk.level === 'orange' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>Risque {risk.level}</p>
 </article>
 );
 })}
 </div>
 )}

 {activePeriod ==="j7" && (
 <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
 <p className="cmm-text-small font-bold cmm-text-primary">{j7.day}</p>
 <ul className="mt-2 cmm-text-caption font-medium cmm-text-secondary space-y-1">
 <li>Min: {j7.min.toFixed(1)}°C / Max: {j7.max.toFixed(1)}°C</li>
 <li>Vent: {j7.wind.toFixed(0)} km/h</li>
 </ul>
 </article>
 )}
 
 <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-slate-100">
 <article className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm cmm-text-small">
 <h3 className="font-semibold cmm-text-primary mb-2">{fr ?"Fenêtres d'intervention" :"Recommended windows"}</h3>
 <ul className="space-y-1.5">
 {windows.recommended.slice(0, 3).map((w) => (
 <li key={w.from} className="cmm-text-caption font-medium text-emerald-800">• {formatDateTimeShort(w.from)} : {w.reason}</li>
 ))}
 </ul>
 </article>
 </div>
 </>
 ) : (
  <div className="space-y-4">
  <div className="bg-slate-100/50 dark:bg-slate-800/50 p-1.5 flex gap-1 rounded-lg w-fit">
  <CmmSkeleton className="h-8 w-24 rounded-md" />
  <CmmSkeleton className="h-8 w-24 rounded-md" />
  <CmmSkeleton className="h-8 w-24 rounded-md" />
  </div>
  <div className="grid gap-3 md:grid-cols-3">
  <CmmSkeleton className="h-28 rounded-xl" />
  <CmmSkeleton className="h-28 rounded-xl" />
  <CmmSkeleton className="h-28 rounded-xl" />
  </div>
  <CmmSkeleton className="h-24 w-full rounded-xl" />
  </div>
  )}
 </div>
 </div>
 ) : (
 <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 items-start animate-in fade-in slide-in-from-bottom-2 duration-500">
 <div className="space-y-4">
 <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md">
 <label className="flex flex-col gap-2 cmm-text-small font-bold cmm-text-primary mb-4">
 {fr ?"Configuration du kit" :"Kit configuration"}
 <select
 value={packType}
 onChange={(e) => setPackType(e.target.value as"solo" |"team" |"school")}
 className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-emerald-500 font-normal mt-1"
 >
 <option value="solo">Solo</option>
 <option value="team">{fr ?"Équipe" :"Team"}</option>
 <option value="school">{fr ?"Scolaire" :"School"}</option>
 </select>
 </label>
 <div className="pt-4 border-t border-slate-100">
 <h2 className="cmm-text-caption font-bold uppercase tracking-widest cmm-text-muted mb-3">{fr ?"Matériel" :"Equipment"}</h2>
 <ul className="grid gap-2 cmm-text-small font-medium cmm-text-secondary">
 {packItems.map((item) => (
 <li key={item} className="flex items-center gap-2">
 <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
 {item}
 </li>
 ))}
 </ul>
 </div>
 </article>
 </div>

 <div className="space-y-4">
 <article className="rounded-3xl border border-slate-200/80 bg-slate-50/80 dark:bg-slate-800/50 dark:border-slate-700/80/50 p-6 shadow-inner">
 <h2 className="text-lg font-bold cmm-text-primary mb-4">{fr ?"Checklist Sécurité" :"Safety Checklist"}</h2>
 <div className="grid gap-3">
 {Object.entries(kitChecks).map(([key, val]) => (
 <label key={key} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 cursor-pointer hover:border-emerald-300 transition shadow-sm">
 <input
 type="checkbox"
 checked={val}
 onChange={() => setKitChecks(prev => ({ ...prev, [key]: !prev[key] }))}
 className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
 />
 <span className="cmm-text-small font-bold cmm-text-primary">
 {key === 'ppe' && (fr ?"EPI vérifiés (gants, gilets)" :"PPE checked")}
 {key === 'bags' && (fr ?"Sacs de tri prêts" :"Sorting bags ready")}
 {key === 'tools' && (fr ?"Pinces et peson fonctionnels" :"Pickers and scale ready")}
 {key === 'briefing' && (fr ?"Parcours et consignes partagés" :"Route & instructions shared")}
 </span>
 </label>
 ))}
 </div>
 <div className="mt-6 flex flex-wrap gap-3">
 <Link href="/actions/new" className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl cmm-text-small font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition">
 {fr ?"Démarrer l'action" :"Start action"}
 </Link>
 <Link href="/sections/guide" className="px-6 py-2.5 bg-white border border-slate-200 cmm-text-secondary rounded-xl cmm-text-small font-bold hover:bg-slate-50 transition">
 {fr ?"Consulter le guide" :"View guide"}
 </Link>
 </div>
 </article>
 </div>
 </div>
 )}
 </div>
 );
}

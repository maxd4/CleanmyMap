"use client";

import { useState, useMemo } from"react";
import dynamic from"next/dynamic";
import { 
 Navigation, 
 Zap
} from"lucide-react";
import { computePollutionScore } from"@/lib/actions/pollution-score";


// dynamic import Leaflet
const MapWithNoSSR = dynamic(
 () => import("react-leaflet").then((mod) => mod.MapContainer),
 { ssr: false }
);
const TileLayer = dynamic(
 () => import("react-leaflet").then((mod) => mod.TileLayer),
 { ssr: false }
);
const Marker = dynamic(
 () => import("react-leaflet").then((mod) => mod.Marker),
 { ssr: false }
);
const Polyline = dynamic(
 () => import("react-leaflet").then((mod) => mod.Polyline),
 { ssr: false }
);

interface Spot {
 id: string;
 lat: number;
 lng: number;
 wasteKg: number;
 butts: number;
}

const MOCK_SPOTS: Spot[] = [
 { id:"1", lat: 48.835, lng: 2.325, wasteKg: 15, butts: 500 },
 { id:"2", lat: 48.840, lng: 2.330, wasteKg: 2, butts: 1500 },
 { id:"3", lat: 48.830, lng: 2.320, wasteKg: 8, butts: 200 },
 { id:"4", lat: 48.845, lng: 2.340, wasteKg: 0.5, butts: 100 },
];

export function SmartRoutingMap() {
 const [timeMinutes, setTimeMinutes] = useState(45);
 const userPos: [number, number] = [48.833, 2.322]; // Paris 14 center

 const routeSpots = useMemo(() => {
 // Basic heuristic: Sort by pollution / distance ratio
 return MOCK_SPOTS
 .map(s => ({
 ...s,
 score: computePollutionScore({ wasteKg: s.wasteKg, cigaretteButts: s.butts })
 }))
 .sort((a, b) => b.score - a.score)
 .slice(0, 3);
 }, []);

 const polylinePositions: [number, number][] = [
 userPos,
 ...routeSpots.map(s => [s.lat, s.lng] as [number, number])
 ];

 return (
 <div className="flex flex-col lg:flex-row gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
 {/* CONTROLS */}
 <div className="lg:w-80 space-y-8 flex flex-col">
 <header>
 <div className="flex items-center gap-2 text-emerald-600 font-bold uppercase tracking-widest cmm-text-caption mb-2">
 <Zap size={14} /> AI ENGINE v1
 </div>
 <h3 className="text-2xl font-bold cmm-text-primary leading-tight">Itinéraire Intelligent.</h3>
 </header>

 <div className="space-y-4">
 <div className="flex justify-between items-end">
 <span className="cmm-text-caption font-bold cmm-text-muted uppercase">Temps estimé</span>
 <span className="text-xl font-bold cmm-text-primary">{timeMinutes} min</span>
 </div>
 <input 
 type="range" 
 min="15" 
 max="120" 
 step="15"
 value={timeMinutes}
 onChange={(e) => setTimeMinutes(parseInt(e.target.value))}
 className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
 />
 <div className="flex justify-between cmm-text-caption font-bold cmm-text-muted uppercase italic">
 <span>Express</span>
 <span>Intensif</span>
 </div>
 </div>

 <div className="flex-1 space-y-3">
 <p className="cmm-text-caption font-bold cmm-text-muted uppercase tracking-widest">Points de collecte optimisés</p>
 {routeSpots.map((spot, idx) => (
 <div key={spot.id} className="flex gap-3 items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
 <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center cmm-text-caption font-bold">
 {idx + 1}
 </span>
 <div className="flex-1">
 <p className="cmm-text-caption font-bold cmm-text-primary">Hotspot {spot.id}</p>
 <p className="cmm-text-caption cmm-text-muted">{spot.wasteKg}kg • {spot.butts} mégots</p>
 </div>
 <div className={`cmm-text-caption font-bold px-2 py-1 rounded ${spot.score > 50 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
 {spot.score}%
 </div>
 </div>
 ))}
 </div>

 <button className="w-full bg-slate-900 text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition shadow-lg">
 <Navigation size={18} /> Démarrer la Mission
 </button>
 </div>

 {/* MAP */}
 <div className="flex-1 h-[500px] rounded-2xl overflow-hidden border border-slate-200 relative">
 <MapWithNoSSR center={userPos} zoom={14} className="h-full w-full">
 <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
 
 <Marker position={userPos} />
 
 {routeSpots.map(spot => (
 <Marker key={spot.id} position={[spot.lat, spot.lng]} />
 ))}

 <Polyline 
 positions={polylinePositions} 
 pathOptions={{ color: '#10b981', weight: 4, dashArray: '8, 8', opacity: 0.8 }} 
 />
 </MapWithNoSSR>
 
 <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 cmm-text-caption font-bold cmm-text-muted shadow-sm sm:block hidden">
 Heuristique : Pollution / Distance
 </div>
 </div>
 </div>
 );
}

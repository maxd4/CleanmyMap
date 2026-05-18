'use client';

import { useEffect, useState, type ReactNode } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { AlertTriangle, Camera, CheckCircle2, FileText, MapPin, Trash2 } from "lucide-react";

type Point = {
  latitude: number;
  longitude: number;
  recorded_at: string;
};

type MissionAction = {
  id: string;
  type: string;
  content?: string;
  image_url?: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
};

type MissionMapProps = {
  points: Point[];
  actions?: MissionAction[];
};

const createActionIcon = (icon: ReactNode, color: string) => {
  const html = renderToStaticMarkup(
    <div
      style={{
        color,
        backgroundColor: "rgba(0,0,0,0.6)",
        padding: "8px",
        borderRadius: "12px",
        border: `1px solid ${color}40`,
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
    >
      {icon}
    </div>
  );

  return L.divIcon({
    html,
    className: "custom-action-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

export function MissionMap({ points, actions = [] }: MissionMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-[500px] w-full animate-pulse rounded-[3rem] bg-slate-100" />;
  }

  if (!points || points.length === 0) {
    return (
      <div className="flex h-[500px] w-full items-center justify-center rounded-[3rem] border border-slate-100 bg-slate-50">
        <p className="font-medium text-slate-400">Aucun tracé GPS disponible pour cette mission.</p>
      </div>
    );
  }

  const positions: [number, number][] = points.map((point) => [point.latitude, point.longitude]);
  const centerLat = positions.reduce((sum, point) => sum + point[0], 0) / positions.length;
  const centerLng = positions.reduce((sum, point) => sum + point[1], 0) / positions.length;

  const getActionConfig = (type: string) => {
    switch (type) {
      case "trash_found":
        return { icon: <Trash2 size={16} />, color: "#fbbf24", label: "Déchet trouvé" };
      case "trash_collected":
        return { icon: <CheckCircle2 size={16} />, color: "#10b981", label: "Ramassé" };
      case "hazard":
        return { icon: <AlertTriangle size={16} />, color: "#f87171", label: "Danger" };
      case "note":
        return { icon: <FileText size={16} />, color: "#60a5fa", label: "Note" };
      case "photo":
        return { icon: <Camera size={16} />, color: "#a78bfa", label: "Photo" };
      default:
        return { icon: <MapPin size={16} />, color: "#ffffff", label: "Action" };
    }
  };

  return (
    <div className="relative z-0 h-[500px] w-full overflow-hidden rounded-[3rem] border border-white/5 shadow-inner">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={16}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <Polyline positions={positions} color="#10b981" weight={6} opacity={0.6} />

        <Marker position={positions[0]}>
          <Popup>Départ de la mission</Popup>
        </Marker>
        <Marker position={positions[positions.length - 1]}>
          <Popup>Position actuelle / Fin</Popup>
        </Marker>

        {actions.map((action) => {
          const config = getActionConfig(action.type);

          return (
            <Marker
              key={action.id}
              position={[action.latitude, action.longitude]}
              icon={createActionIcon(config.icon, config.color)}
            >
              <Popup>
                <div className="p-2">
                  <div className="mb-1 flex items-center gap-2">
                    <span style={{ color: config.color }}>{config.icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">{config.label}</span>
                  </div>
                  {action.content && <p className="text-xs text-slate-600">{action.content}</p>}
                  {action.image_url && (
                    <div className="mt-2 overflow-hidden rounded-xl border border-slate-100">
                      <img src={action.image_url} className="h-32 w-full object-cover" alt="Action captured" />
                    </div>
                  )}
                  <p className="mt-2 text-[9px] text-slate-400">
                    {new Date(action.recorded_at).toLocaleTimeString()}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

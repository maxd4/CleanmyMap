"'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Flag, Trash2, CheckCircle2, AlertTriangle, FileText, Camera } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

// Helper to create a custom divIcon from a Lucide icon
const createActionIcon = (icon: React.ReactNode, color: string) => {
  const html = renderToStaticMarkup(
    <div style={{ 
      color, 
      backgroundColor: 'rgba(0,0,0,0.6)', 
      padding: '8px', 
      borderRadius: '12px', 
      border: `1px solid ${color}40`,
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    }}>
      {icon}
    </div>
  );
  return L.divIcon({
    html,
    className: 'custom-action-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

interface Point {
  latitude: number;
  longitude: number;
  recorded_at: string;
}

interface MissionAction {
  id: string;
  type: string;
  content?: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
}

interface MissionMapProps {
  points: Point[];
  actions?: MissionAction[];
}

export function MissionMap({ points, actions = [] }: MissionMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className=\"h-[500px] w-full bg-slate-100 animate-pulse rounded-[3rem]\" />;
  
  if (!points || points.length === 0) {
    return (
      <div className=\"h-[500px] w-full bg-slate-50 flex items-center justify-center rounded-[3rem] border border-slate-100\">
        <p className=\"text-slate-400 font-medium\">Aucun tracé GPS disponible pour cette mission.</p>
      </div>
    );
  }

  const positions: [number, number][] = points.map(p => [p.latitude, p.longitude]);
  
  // Calculate center
  const centerLat = positions.reduce((sum, p) => sum + p[0], 0) / positions.length;
  const centerLng = positions.reduce((sum, p) => sum + p[1], 0) / positions.length;

  const getActionConfig = (type: string) => {
    switch (type) {
      case 'trash_found': return { icon: <Trash2 size={16} />, color: '#fbbf24', label: 'Déchet trouvé' };
      case 'trash_collected': return { icon: <CheckCircle2 size={16} />, color: '#10b981', label: 'Ramassé' };
      case 'hazard': return { icon: <AlertTriangle size={16} />, color: '#f87171', label: 'Danger' };
      case 'note': return { icon: <FileText size={16} />, color: '#60a5fa', label: 'Note' };
      case 'photo': return { icon: <Camera size={16} />, color: '#a78bfa', label: 'Photo' };
      default: return { icon: <MapPin size={16} />, color: '#ffffff', label: 'Action' };
    }
  };

  return (
    <div className=\"h-[500px] w-full rounded-[3rem] overflow-hidden border border-white/5 shadow-inner relative z-0\">
      <MapContainer 
        center={[centerLat, centerLng]} 
        zoom={16} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors'
          url=\"https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png\"
        />
        
        <Polyline 
          positions={positions} 
          color=\"#10b981\" 
          weight={6}
          opacity={0.6}
        />

        {/* Start / End Markers */}
        <Marker position={positions[0]}>
          <Popup>Départ de la mission</Popup>
        </Marker>
        <Marker position={positions[positions.length - 1]}>
          <Popup>Position actuelle / Fin</Popup>
        </Marker>

        {/* Actions Markers */}
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
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color: config.color }}>{config.icon}</span>
                    <span className="font-black uppercase text-[10px] tracking-widest">{config.label}</span>
                  </div>
                  {action.content && <p className="text-xs text-slate-600">{action.content}</p>}
                  {action.image_url && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-100">
                      <img 
                        src={action.image_url} 
                        className="w-full h-32 object-cover" 
                        alt="Action captured" 
                      />
                    </div>
                  )}
                  <p className="text-[9px] text-slate-400 mt-2">
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

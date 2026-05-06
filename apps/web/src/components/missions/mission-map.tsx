'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Flag } from 'lucide-react';

// Configuration des icônes pour Leaflet
const startIcon = new L.Icon({
  iconUrl: '/start-marker.png', // A remplacer par une vraie icône ou un divIcon
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const endIcon = new L.Icon({
  iconUrl: '/end-marker.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface Point {
  latitude: number;
  longitude: number;
  recorded_at: string;
}

interface MissionMapProps {
  points: Point[];
}

export function MissionMap({ points }: MissionMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-3xl" />;
  if (!points || points.length === 0) {
    return (
      <div className="h-[400px] w-full bg-slate-50 flex items-center justify-center rounded-3xl border border-slate-100">
        <p className="text-slate-400 font-medium">Aucun tracé GPS disponible pour cette mission.</p>
      </div>
    );
  }

  const positions: [number, number][] = points.map(p => [p.latitude, p.longitude]);
  const startPoint = positions[0];
  const endPoint = positions[positions.length - 1];

  // Calculer le centre (moyenne des lats et longs)
  const centerLat = positions.reduce((sum, p) => sum + p[0], 0) / positions.length;
  const centerLng = positions.reduce((sum, p) => sum + p[1], 0) / positions.length;

  return (
    <div className="h-[400px] w-full rounded-3xl overflow-hidden border border-slate-200 shadow-inner relative z-0">
      <MapContainer 
        center={[centerLat, centerLng]} 
        zoom={15} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" // Carte stylisée neutre
        />
        
        <Polyline 
          positions={positions} 
          color="#10b981" // emerald-500
          weight={4}
          opacity={0.8}
        />
        
        {startPoint && (
          <Marker position={startPoint}>
            <Popup>
              <div className="font-bold text-slate-800 flex items-center gap-2">
                <Flag size={14} className="text-emerald-600" />
                Départ
              </div>
            </Popup>
          </Marker>
        )}
        
        {endPoint && positions.length > 1 && (
          <Marker position={endPoint}>
            <Popup>
              <div className="font-bold text-slate-800 flex items-center gap-2">
                <MapPin size={14} className="text-rose-600" />
                Arrivée
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

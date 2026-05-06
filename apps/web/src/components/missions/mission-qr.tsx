import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface MissionQRProps {
  missionId: string;
}

export function MissionQR({ missionId }: MissionQRProps) {
  // En production, utiliser l'URL du site via process.env.NEXT_PUBLIC_APP_URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cleanmymap.fr';
  const url = `${baseUrl}/mission/start?id=${missionId}`;
  
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-100 shadow-sm gap-4">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-black text-slate-800">Tracking GPS</h3>
        <p className="text-sm text-slate-500 max-w-xs">
          Scannez ce QR Code avec l'application Compagnon ou votre appareil photo pour démarrer l'enregistrement de votre nettoyage.
        </p>
      </div>
      
      <div className="p-4 bg-white rounded-2xl shadow-inner border border-slate-50">
        <QRCodeSVG 
          value={url} 
          size={200}
          level="H"
          fgColor="#10b981" // emerald-500
          bgColor="#ffffff"
        />
      </div>
      
      <div className="px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
        <p className="text-[10px] font-mono text-slate-400 select-all">{url}</p>
      </div>
    </div>
  );
}

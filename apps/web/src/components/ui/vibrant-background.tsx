"use client";

import React from "react";

export function VibrantBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* Mesh Gradient Bloom 1 - Emerald/Green */}
      <div 
        className="absolute -top-[20%] -left-[10%] h-[80%] w-[80%] rounded-full bg-emerald-400/20 blur-[140px] mix-blend-multiply dark:mix-blend-soft-light animate-pulse" 
        style={{ animationDuration: '12s' }}
      />
      {/* Mesh Gradient Bloom 2 - Indigo/Blue */}
      <div 
        className="absolute top-[10%] -right-[15%] h-[70%] w-[70%] rounded-full bg-indigo-500/20 blur-[130px] mix-blend-multiply dark:mix-blend-soft-light animate-pulse" 
        style={{ animationDuration: '18s', animationDelay: '3s' }}
      />
      {/* Mesh Gradient Bloom 3 - Cyan/Teal */}
      <div 
        className="absolute -bottom-[20%] left-[10%] h-[60%] w-[60%] rounded-full bg-cyan-400/20 blur-[120px] mix-blend-multiply dark:mix-blend-soft-light animate-pulse" 
        style={{ animationDuration: '15s', animationDelay: '1s' }}
      />
      
      {/* Subtle Grain Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
    </div>
  );
}

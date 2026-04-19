"use client";

import React from "react";

export function VibrantBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* Mesh Gradient Bloom 1 */}
      <div 
        className="absolute -top-[10%] -left-[10%] h-[60%] w-[60%] rounded-full bg-emerald-200/40 blur-[120px] animate-pulse" 
        style={{ animationDuration: '8s' }}
      />
      {/* Mesh Gradient Bloom 2 */}
      <div 
        className="absolute top-[20%] -right-[10%] h-[50%] w-[50%] rounded-full bg-indigo-200/30 blur-[100px] animate-pulse" 
        style={{ animationDuration: '12s', animationDelay: '2s' }}
      />
      {/* Mesh Gradient Bloom 3 */}
      <div 
        className="absolute -bottom-[10%] left-[20%] h-[45%] w-[45%] rounded-full bg-sky-200/40 blur-[110px] animate-pulse" 
        style={{ animationDuration: '10s', animationDelay: '1s' }}
      />
      
      {/* Subtle Grain Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
    </div>
  );
}

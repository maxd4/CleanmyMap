"use client";
import React from 'react';

export default function GamificationToast({ message }: { message: string }) {
  return (
    <div style={{position:'fixed', right:20, bottom:20, background:'#0b73ff', color:'#fff', padding:12, borderRadius:8, boxShadow:'0 4px 12px rgba(0,0,0,0.15)'}}>
      {message}
    </div>
  );
}

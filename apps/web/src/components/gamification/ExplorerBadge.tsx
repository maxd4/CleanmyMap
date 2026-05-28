import React from "react";

type Tier = {
  id: string;
  title: string;
  icon: string;
  min: number;
  max: number;
  texture?: string;
};

export default function ExplorerBadge({
  tiers,
  current,
  onTierReached,
}: {
  tiers: Tier[];
  current: number;
  onTierReached?: (tier: Tier) => void;
}) {
  const activeTier = tiers.slice().reverse().find((t) => current >= t.min) || tiers[0];

  React.useEffect(() => {
    if (onTierReached) onTierReached(activeTier);
  }, [activeTier.id]);

  const tierProgress = Math.max(0, Math.min(current - activeTier.min + 1, activeTier.max - activeTier.min + 1));
  const tierTarget = activeTier.max === Number.MAX_SAFE_INTEGER ? Math.max(100, activeTier.min) : activeTier.max - activeTier.min + 1;

  return (
    <div className={`explorer-badge explorer-badge--${activeTier.id}`} style={{padding:12, textAlign:'center'}}>
      <div className="explorer-badge__texture" style={{backgroundImage: `url(${activeTier.texture || ''})`, borderRadius:12, padding:18}}>
        <div className="explorer-badge__icon" style={{fontSize:40}}>{activeTier.icon}</div>
        <div className="explorer-badge__title" style={{marginTop:8,fontWeight:700}}>{activeTier.title}</div>
        <div className="explorer-badge__progress" style={{marginTop:10}}>
          {/* Treasure-map dotted line style */}
          <div style={{fontFamily:'monospace'}}>{Array.from({length: tierTarget}).map((_,i)=> i < tierProgress ? '•' : '·').join(' ')}</div>
          <div style={{fontSize:12, color:'#666', marginTop:6}}>{`${Math.min(current, activeTier.max)} / ${activeTier.max === Number.MAX_SAFE_INTEGER ? '∞' : activeTier.max}`}</div>
        </div>
      </div>
    </div>
  );
}

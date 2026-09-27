export function ActionsMapCanvasStyles({ isEmerald }: { isEmerald: boolean }) {
  return (
    <style>{`
      .cmm-infrastructure-marker {
        background: transparent;
        border: none;
      }
      .cmm-infrastructure-marker__outer {
        position: relative;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .cmm-infrastructure-marker__outer:hover {
        transform: scale(1.15) translateY(-4px);
      }
      .cmm-infrastructure-marker__glow {
        position: absolute;
        width: 32px;
        height: 32px;
        background: radial-gradient(circle, rgba(125, 211, 252, 0.36) 0%, transparent 70%);
        border-radius: 50%;
        animation: pulse-glow 2s infinite;
      }
      .cmm-infrastructure-marker__inner {
        position: relative;
        width: 34px;
        height: 34px;
        background: rgba(16, 40, 64, 0.88);
        border: 1px solid rgba(125, 211, 252, 0.16);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.28);
      }
      .cmm-infrastructure-marker__emoji {
        font-size: 20px;
      }
      .cmm-trash-spotter-cluster {
        background: transparent;
        border: none;
      }
      .cmm-trash-spotter-cluster__body {
        width: 100%;
        height: 100%;
        border-radius: 999px;
        border: 1px solid rgba(100, 116, 139, 0.35);
        background: linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(226, 232, 240, 0.9));
        color: #334155;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        box-shadow: 0 20px 30px -16px rgba(71, 85, 105, 0.3);
      }
      .cmm-trash-spotter-cluster__count {
        font-size: 0.95rem;
        font-weight: 900;
        line-height: 1;
      }
      .cmm-trash-spotter-cluster__label {
        font-size: 0.48rem;
        font-weight: 900;
        letter-spacing: 0.26em;
        text-transform: uppercase;
        opacity: 0.72;
      }
      .cmm-action-geometry-endpoint-icon,
      .cmm-action-geometry-direction-icon {
        background: transparent;
        border: none;
        pointer-events: none;
      }
      .cmm-action-geometry-endpoint {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(255, 255, 255, 0.95);
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.94);
        color: #ffffff;
        font-size: 0.52rem;
        font-weight: 900;
        line-height: 1;
        letter-spacing: -0.04em;
        box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.72), 0 2px 6px rgba(15, 23, 42, 0.42);
      }
      .cmm-action-geometry-direction {
        display: block;
        color: #ffffff;
        font-size: 0.82rem;
        line-height: 1;
        text-shadow: -1px -1px 0 #0f172a, 1px -1px 0 #0f172a, -1px 1px 0 #0f172a, 1px 1px 0 #0f172a;
      }
      @keyframes pulse-glow {
        0% { transform: scale(0.95); opacity: 0.5; }
        50% { transform: scale(1.2); opacity: 0.8; }
        100% { transform: scale(0.95); opacity: 0.5; }
      }
      .leaflet-container {
        background: var(--bg-canvas, ${isEmerald ? "#f5fbf3" : "#061423"});
      }
    `}</style>
  );
}

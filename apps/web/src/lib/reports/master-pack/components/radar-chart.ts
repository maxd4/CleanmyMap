export type RadarPoint = {
  label: string;
  value: number; // 0 to 100
};

export function generateRadarChartSvg(points: RadarPoint[], size = 300): string {
  const center = size / 2;
  const radius = (size / 2) * 0.8;
  const angleStep = (Math.PI * 2) / points.length;

  // Background circles
  const circles = [0.2, 0.4, 0.6, 0.8, 1.0].map((r) => {
    return `<circle cx="${center}" cy="${center}" r="${radius * r}" fill="none" stroke="#e2e8f0" stroke-width="1" />`;
  }).join("");

  // Axes
  const axes = points.map((_, i) => {
    const x = center + radius * Math.cos(i * angleStep - Math.PI / 2);
    const y = center + radius * Math.sin(i * angleStep - Math.PI / 2);
    return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="#e2e8f0" stroke-width="1" />`;
  }).join("");

  // Labels
  const labels = points.map((p, i) => {
    const x = center + (radius + 20) * Math.cos(i * angleStep - Math.PI / 2);
    const y = center + (radius + 20) * Math.sin(i * angleStep - Math.PI / 2);
    return `<text x="${x}" y="${y}" text-anchor="middle" font-family="Outfit" font-size="10" fill="#64748b" font-weight="600">${p.label}</text>`;
  }).join("");

  // Shape
  const polyPoints = points.map((p, i) => {
    const val = Math.max(10, p.value); // min size for visibility
    const x = center + (radius * (val / 100)) * Math.cos(i * angleStep - Math.PI / 2);
    const y = center + (radius * (val / 100)) * Math.sin(i * angleStep - Math.PI / 2);
    return `${x},${y}`;
  }).join(" ");

  const shape = `
    <polygon points="${polyPoints}" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-width="2" />
    ${points.map((p, i) => {
      const val = Math.max(10, p.value);
      const x = center + (radius * (val / 100)) * Math.cos(i * angleStep - Math.PI / 2);
      const y = center + (radius * (val / 100)) * Math.sin(i * angleStep - Math.PI / 2);
      return `<circle cx="${x}" cy="${y}" r="3" fill="#10b981" />`;
    }).join("")}
  `;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      ${circles}
      ${axes}
      ${shape}
      ${labels}
    </svg>
  `;
}

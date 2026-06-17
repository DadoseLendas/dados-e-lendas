export function getGridBg(
  gridColor: string,
  gridOpacity: number,
  gridPx: number,
  gridDashed: boolean,
  gridThickness: number,
  gridDashFrequency: number
) {
  const r = parseInt(gridColor.slice(1, 3), 16);
  const g = parseInt(gridColor.slice(3, 5), 16);
  const b = parseInt(gridColor.slice(5, 7), 16);
  const rgba = `rgba(${r}, ${g}, ${b}, ${gridOpacity})`;

  if (gridDashed) {
    const dashSize = Math.max(2, gridPx / gridDashFrequency);
    const svg = `<svg width="${gridPx}" height="${gridPx}" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="0" x2="${gridPx}" y2="0" stroke="${gridColor}" stroke-width="${gridThickness}" stroke-dasharray="${dashSize},${dashSize}" opacity="${gridOpacity}"/>
        <line x1="0" y1="0" x2="0" y2="${gridPx}" stroke="${gridColor}" stroke-width="${gridThickness}" stroke-dasharray="${dashSize},${dashSize}" opacity="${gridOpacity}"/>
      </svg>`;
    return `url('data:image/svg+xml,${encodeURIComponent(svg)}')`;
  } else {
    return `linear-gradient(to right, ${rgba} ${gridThickness}px, transparent ${gridThickness}px), linear-gradient(to bottom, ${rgba} ${gridThickness}px, transparent ${gridThickness}px)`;
  }
}

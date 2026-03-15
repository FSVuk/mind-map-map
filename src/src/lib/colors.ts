export const MUTED_PALETTE = {
  // Greens
  dustySage: "#6B7F5E",
  darkForest: "#4A5E3D",
  mossOlive: "#7A8C5A",
  fadedMeadow: "#8A9E6E",

  // Grays
  stoneGray: "#8B9EA8",
  silverMist: "#A0AAA4",
  coolSteel: "#6D7B82",

  // Tans / Browns / Earth
  sandyTan: "#C4A882",
  warmBrown: "#8E7B6B",
  dustyPeach: "#BDA08A",
  clayBrown: "#9E8A72",

  // Warm muted
  mutedAmber: "#B8885C",
  dustyWheat: "#C4B078",
  dustyRose: "#9E6B6B",
  fadedCoral: "#A87868",

  // Pinks / Mauves
  dustyMauve: "#A87C8A",
  fadedPlum: "#8A6878",

  // Cool muted
  dustyPlum: "#7D6B8A",
  mutedLilac: "#9E94A8",
  mutedSlate: "#5A5E78",
  sageTeal: "#6A8E82",
  mutedCyan: "#7A9EA0",

  // Darks
  deepNavy: "#3A3E4A",
  charcoal: "#2E3238",

  // Accent yellows
  mutedGold: "#B8A860",
  paleYellow: "#C8BA78",
} as const;

export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h: h * 360, s, l };
}

export function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  h = h / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

export function getHoverColor(baseColor: string): string {
  const { h, s, l } = hexToHSL(baseColor);
  return hslToHex(h, Math.min(s + 0.08, 1), Math.min(l + 0.12, 1));
}

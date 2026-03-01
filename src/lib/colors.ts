export const MUTED_PALETTE = {
  // ── Reds ──────────────────────────────
  dustyRose: "#B07070",
  fadedCrimson: "#A65858",
  // ── Red-Oranges ───────────────────────
  fadedCoral: "#B87868",
  terracotta: "#B8806A",
  // ── Oranges ───────────────────────────
  burntSienna: "#B8885C",
  mutedAmber: "#C09468",
  // ── Orange-Yellows ────────────────────
  sandyTan: "#C4A882",
  dustyPeach: "#C8AC80",
  // ── Yellows ───────────────────────────
  mutedGold: "#B8A860",
  paleStraw: "#C8BA78",
  // ── Yellow-Greens ─────────────────────
  fadedLime: "#A0A860",
  oliveGold: "#8E9A58",
  // ── Greens ────────────────────────────
  mossOlive: "#7A8C5A",
  fadedMeadow: "#8A9E6E",
  // ── Green-Teals ───────────────────────
  dustySage: "#6B8E6E",
  sageTeal: "#6A8E82",
  // ── Teals ─────────────────────────────
  mutedTeal: "#5E8E8A",
  deepLagoon: "#588880",
  // ── Teal-Blues ─────────────────────────
  mutedCyan: "#6A9EA0",
  stormSea: "#6090A0",
  // ── Blues ──────────────────────────────
  stoneBlue: "#6888A8",
  mutedDenim: "#5E78A0",
  // ── Blue-Indigos ──────────────────────
  mutedSlate: "#5A6898",
  fadedIndigo: "#6870A0",
  // ── Purples ───────────────────────────
  dustyPlum: "#7D6B8A",
  mutedLilac: "#8878A8",
  // ── Purple-Magentas ───────────────────
  fadedPlum: "#8A6888",
  dustyMauve: "#A07C90",
  // ── Magentas / Pinks ──────────────────
  mutedBerry: "#A06880",
  fadedRaspberry: "#A87088",
  // ── Neutrals ──────────────────────────
  warmBrown: "#8E7B6B",
  stoneGray: "#8B9EA8",
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

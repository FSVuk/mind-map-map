// ── Region data (persisted) ──────────────────────────────────────
export interface RegionData {
  name: string;
  color: string;
  description: string;
}

// ── Pins (persisted) ─────────────────────────────────────────────
export interface Pin {
  id: string;
  type: "pin" | "city";
  x: number;
  y: number;
  label: string;
  content: string; // markdown
  regionId: string;
  parentCityId?: string;
  images: ImageAttachment[];
}

export interface ImageAttachment {
  id: string;
  filename: string;
  dataUrl: string;
}

// ── App state (persisted in localStorage) ────────────────────────
export interface AppState {
  regions: Record<string, RegionData>;
  pins: Pin[];
  nextPinId: number;
}

// ── UI state (not persisted) ─────────────────────────────────────
export type SidebarTab = "map" | "library" | "overlays" | "settings";

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PanelMode =
  | { type: "none" }
  | { type: "region"; regionId: string }
  | { type: "pin"; pinId: string }
  | { type: "new-pin"; x: number; y: number; regionId: string };

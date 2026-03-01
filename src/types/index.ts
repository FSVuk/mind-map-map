export interface MapRegion {
  id: string;
  name: string;
  continent: "northwest" | "southern" | "eastern" | "island";
  d: string; // SVG path data in viewBox 0 0 1567 668
  fillColor: string;
  tags?: string[];
}

export interface MapPin {
  id: string;
  x: number; // SVG coordinate
  y: number; // SVG coordinate
  type: "location" | "note" | "image" | "diamond";
  label: string;
  tags?: string[];
  thumbnail?: string;
}

export interface TooltipData {
  pin: MapPin;
  screenX: number;
  screenY: number;
}

export type SidebarTab = "map" | "library" | "overlays" | "settings";

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

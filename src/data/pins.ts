import type { MapPin } from "@/types";

export const SAMPLE_PINS: MapPin[] = [
  { id: "pin_1", x: 480, y: 150, type: "diamond", label: "The Capital", tags: ["Architecture", "History"] },
  { id: "pin_2", x: 350, y: 180, type: "image", label: "Mountain Pass", tags: ["Geography"], thumbnail: "/images/map_regions.png" },
  { id: "pin_3", x: 220, y: 200, type: "location", label: "River Crossing", tags: ["Fauna", "Trade"] },
  { id: "pin_4", x: 810, y: 290, type: "note", label: "Ancient Ruins", tags: ["Lore", "History"] },
  { id: "pin_5", x: 1150, y: 160, type: "location", label: "Northern Keep", tags: ["Architecture"] },
  { id: "pin_6", x: 450, y: 440, type: "location", label: "Southern Port", tags: ["Trade", "Fauna"] },
  { id: "pin_7", x: 1200, y: 400, type: "diamond", label: "Eastern Citadel", tags: ["Architecture", "Faction"] },
  { id: "pin_8", x: 680, y: 270, type: "note", label: "Sea Route Notes", tags: ["Trade"] },
];

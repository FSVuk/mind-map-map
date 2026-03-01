"use client";

import MapRegion from "./MapRegion";
import type { MapRegion as MapRegionType } from "@/types";

interface MapRegionsProps {
  regions: MapRegionType[];
  hoveredRegion: string | null;
  activeRegion: string | null;
  onRegionClick: (id: string) => void;
  onRegionHover: (id: string | null) => void;
}

export default function MapRegions({
  regions,
  hoveredRegion,
  activeRegion,
  onRegionClick,
  onRegionHover,
}: MapRegionsProps) {
  return (
    <g id="regions">
      {regions.map((region) => (
        <MapRegion
          key={region.id}
          region={region}
          isHovered={hoveredRegion === region.id}
          isActive={activeRegion === region.id}
          onClick={onRegionClick}
          onMouseEnter={onRegionHover}
          onMouseLeave={() => onRegionHover(null)}
        />
      ))}
    </g>
  );
}

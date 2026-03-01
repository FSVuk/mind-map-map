"use client";

import { memo } from "react";
import type { MapRegion as MapRegionType } from "@/types";

interface MapRegionProps {
  region: MapRegionType;
  isHovered: boolean;
  isActive: boolean;
  onClick: (id: string) => void;
  onMouseEnter: (id: string) => void;
  onMouseLeave: () => void;
}

function MapRegionComponent({
  region,
  isHovered,
  isActive,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: MapRegionProps) {
  return (
    <path
      d={region.d}
      fill={region.fillColor}
      stroke="#0B1120"
      strokeWidth={2}
      className={`map-region ${isActive ? "active" : ""}`}
      style={{
        filter: isHovered && !isActive ? "brightness(1.3)" : undefined,
      }}
      onClick={() => onClick(region.id)}
      onMouseEnter={() => onMouseEnter(region.id)}
      onMouseLeave={onMouseLeave}
    >
      <title>{region.name}</title>
    </path>
  );
}

export default memo(MapRegionComponent);

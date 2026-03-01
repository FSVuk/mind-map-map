"use client";

import { memo } from "react";
import type { MapPin } from "@/types";

interface PinMarkerProps {
  pin: MapPin;
  scale: number;
  onClick: (pin: MapPin) => void;
  onMouseEnter: (pin: MapPin) => void;
  onMouseLeave: () => void;
}

function PinMarkerComponent({
  pin,
  scale,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: PinMarkerProps) {
  const iconSize = 24 * scale;
  const halfIcon = iconSize / 2;

  return (
    <g
      className="map-pin"
      transform={`translate(${pin.x}, ${pin.y})`}
      onClick={() => onClick(pin)}
      onMouseEnter={() => onMouseEnter(pin)}
      onMouseLeave={onMouseLeave}
      style={{ cursor: "pointer" }}
    >
      {pin.type === "diamond" && (
        <g transform={`scale(${scale})`}>
          <polygon
            points="0,-14 10,0 0,14 -10,0"
            fill="#9E6B6B"
            stroke="#C8D0DC"
            strokeWidth={1.5}
          />
          <polygon
            points="0,-8 6,0 0,8 -6,0"
            fill="#C4A882"
            stroke="none"
          />
        </g>
      )}

      {pin.type === "location" && (
        <g transform={`translate(${-halfIcon / 2}, ${-iconSize}) scale(${scale})`}>
          <path
            d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9zm0 12.75c-2.07 0-3.75-1.68-3.75-3.75S9.93 5.25 12 5.25s3.75 1.68 3.75 3.75-1.68 3.75-3.75 3.75z"
            fill="#C8D0DC"
            stroke="#0B1120"
            strokeWidth={0.5}
          />
        </g>
      )}

      {pin.type === "note" && (
        <g transform={`translate(${-10 * scale}, ${-12 * scale}) scale(${scale})`}>
          <rect
            x={0}
            y={0}
            width={20}
            height={24}
            rx={2}
            fill="#3A3E4A"
            stroke="#6B7A90"
            strokeWidth={1}
          />
          <line x1={4} y1={7} x2={16} y2={7} stroke="#6B7A90" strokeWidth={1} />
          <line x1={4} y1={12} x2={16} y2={12} stroke="#6B7A90" strokeWidth={1} />
          <line x1={4} y1={17} x2={12} y2={17} stroke="#6B7A90" strokeWidth={1} />
        </g>
      )}

      {pin.type === "image" && (
        <g transform={`translate(${-12 * scale}, ${-12 * scale}) scale(${scale})`}>
          <rect
            x={0}
            y={0}
            width={24}
            height={24}
            rx={3}
            fill="#3A3E4A"
            stroke="#6B7A90"
            strokeWidth={1}
          />
          <path
            d="M4 18l4-5 3 3.5 4-5 5 6.5H4z"
            fill="#6B7A90"
            opacity={0.6}
          />
          <circle cx={8} cy={8} r={2} fill="#C4B078" />
        </g>
      )}
    </g>
  );
}

export default memo(PinMarkerComponent);

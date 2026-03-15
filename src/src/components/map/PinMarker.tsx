"use client";

import { memo } from "react";
import type { Pin } from "@/types";

interface PinMarkerProps {
  pin: Pin;
  scale: number;
  isActive: boolean;
  onClick: (pin: Pin) => void;
}

function PinMarkerComponent({ pin, scale, isActive, onClick }: PinMarkerProps) {
  const s = Math.max(scale, 0.15);
  const accentColor = isActive ? "#5EAFD4" : "#C8D0DC";
  const darkColor = isActive ? "#3A8AB0" : "#0B1120";

  return (
    <g
      transform={`translate(${pin.x}, ${pin.y})`}
      onClick={(e) => {
        e.stopPropagation();
        onClick(pin);
      }}
      style={{ cursor: "pointer" }}
    >
      {pin.type === "city" ? (
        <g transform={`scale(${s})`}>
          <circle
            r={12}
            fill={darkColor}
            stroke={accentColor}
            strokeWidth={2}
          />
          <circle r={4} fill={accentColor} />
        </g>
      ) : (
        <g transform={`translate(0, ${-20 * s}) scale(${s})`}>
          <path
            d="M0-12a12 12 0 0 0-12 12c0 9 12 20 12 20s12-11 12-20a12 12 0 0 0-12-12z"
            fill={accentColor}
            stroke={darkColor}
            strokeWidth={1.5}
          />
          <circle cy={-1} r={5} fill={darkColor} />
        </g>
      )}
      <text
        y={pin.type === "city" ? 20 * s : -35 * s}
        textAnchor="middle"
        fill="#C8D0DC"
        fontSize={11 * s}
        fontFamily="sans-serif"
        style={{ pointerEvents: "none" }}
      >
        {pin.label}
      </text>
    </g>
  );
}

export default memo(PinMarkerComponent);

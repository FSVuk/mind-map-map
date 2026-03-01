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
  // scale = viewBox.w / BASE_W (1 at world view, smaller when zoomed in)
  // We want pins to stay a constant screen size, so scale them UP with the viewBox ratio
  const s = Math.max(0.4, Math.min(2.5, scale * 1.8));

  if (pin.type === "city") {
    return (
      <g
        transform={`translate(${pin.x}, ${pin.y})`}
        onClick={(e) => { e.stopPropagation(); onClick(pin); }}
        style={{ cursor: "pointer" }}
      >
        <circle
          r={8 * s}
          fill={isActive ? "#5EAFD4" : "#C8D0DC"}
          stroke="#0B1120"
          strokeWidth={1.5 * s}
        />
        <circle r={3 * s} fill="#0B1120" />
        <title>{pin.label}</title>
      </g>
    );
  }

  // Default pin marker
  return (
    <g
      transform={`translate(${pin.x}, ${pin.y})`}
      onClick={(e) => { e.stopPropagation(); onClick(pin); }}
      style={{ cursor: "pointer" }}
    >
      <g transform={`translate(0, ${-18 * s}) scale(${s})`}>
        <path
          d="M0 0C-5 0-9 4-9 9c0 6.75 9 15 9 15s9-8.25 9-15c0-5-4-9-9-9z"
          fill={isActive ? "#5EAFD4" : "#C8D0DC"}
          stroke="#0B1120"
          strokeWidth={1}
        />
        <circle cy={9} r={3.5} fill="#0B1120" />
      </g>
      <title>{pin.label}</title>
    </g>
  );
}

export default memo(PinMarkerComponent);

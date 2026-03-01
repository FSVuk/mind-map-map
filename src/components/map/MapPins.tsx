"use client";

import PinMarker from "./PinMarker";
import type { MapPin } from "@/types";

interface MapPinsProps {
  pins: MapPin[];
  scale: number;
  onPinClick: (pin: MapPin) => void;
  onPinHover: (pin: MapPin | null) => void;
}

export default function MapPins({
  pins,
  scale,
  onPinClick,
  onPinHover,
}: MapPinsProps) {
  return (
    <g id="pins">
      {pins.map((pin) => (
        <PinMarker
          key={pin.id}
          pin={pin}
          scale={scale}
          onClick={onPinClick}
          onMouseEnter={onPinHover}
          onMouseLeave={() => onPinHover(null)}
        />
      ))}
    </g>
  );
}

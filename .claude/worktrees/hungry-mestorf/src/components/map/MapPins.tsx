"use client";

import PinMarker from "./PinMarker";
import type { Pin } from "@/types";

interface MapPinsProps {
  pins: Pin[];
  scale: number;
  onPinClick: (pin: Pin) => void;
  activePinId: string | null;
}

export default function MapPins({
  pins,
  scale,
  onPinClick,
  activePinId,
}: MapPinsProps) {
  return (
    <g id="pins">
      {pins.map((pin) => (
        <PinMarker
          key={pin.id}
          pin={pin}
          scale={scale}
          isActive={pin.id === activePinId}
          onClick={onPinClick}
        />
      ))}
    </g>
  );
}

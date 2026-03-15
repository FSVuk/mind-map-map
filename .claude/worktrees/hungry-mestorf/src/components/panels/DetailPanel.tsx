"use client";

import { X, ArrowLeft } from "lucide-react";
import type { PanelMode } from "@/types";
import RegionEditor from "./RegionEditor";
import PinEditor from "./PinEditor";
import { useMap } from "@/lib/MapContext";

interface DetailPanelProps {
  mode: PanelMode;
  onClose: () => void;
  onPanelChange: (mode: PanelMode) => void;
}

export default function DetailPanel({
  mode,
  onClose,
  onPanelChange,
}: DetailPanelProps) {
  const { state } = useMap();

  if (mode.type === "none") return null;

  // For pin mode, find the pin to show a back-to-region button
  const pin =
    mode.type === "pin"
      ? state.pins.find((p) => p.id === mode.pinId)
      : null;

  return (
    <aside className="w-96 h-full bg-vanzemla-sidebar border-l border-vanzemla-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-vanzemla-border">
        <div className="flex items-center gap-2">
          {mode.type === "pin" && pin && (
            <button
              onClick={() =>
                onPanelChange({ type: "region", regionId: pin.regionId })
              }
              className="text-vanzemla-text-dim hover:text-vanzemla-text transition-colors"
              title="Back to region"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <h2 className="text-sm font-display tracking-wider text-vanzemla-text uppercase">
            {mode.type === "region" ? "Region" : "Pin"}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-vanzemla-text-dim hover:text-vanzemla-text transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {mode.type === "region" && (
          <RegionEditor regionId={mode.regionId} onPanelChange={onPanelChange} />
        )}
        {mode.type === "pin" && <PinEditor pinId={mode.pinId} />}
      </div>
    </aside>
  );
}

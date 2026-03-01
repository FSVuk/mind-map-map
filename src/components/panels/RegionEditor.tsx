"use client";

import { useMap } from "@/lib/MapContext";
import ColorPicker from "./ColorPicker";
import MarkdownField from "./MarkdownField";
import { MapPin, Building2 } from "lucide-react";
import type { PanelMode } from "@/types";

interface RegionEditorProps {
  regionId: string;
  onPanelChange: (mode: PanelMode) => void;
}

export default function RegionEditor({ regionId, onPanelChange }: RegionEditorProps) {
  const { getRegionData, updateRegion, getPinsInRegion } = useMap();
  const region = getRegionData(regionId);
  const pins = getPinsInRegion(regionId);

  return (
    <div className="p-4 space-y-5">
      {/* Region name */}
      <div>
        <label className="block text-[10px] font-display tracking-wider text-vanzemla-text-dim uppercase mb-1">
          Name
        </label>
        <input
          type="text"
          value={region.name}
          onChange={(e) => updateRegion(regionId, { name: e.target.value })}
          placeholder="Unnamed Region"
          className="w-full px-3 py-2 bg-vanzemla-bg border border-vanzemla-border rounded text-sm text-vanzemla-text focus:outline-none focus:border-vanzemla-accent"
        />
      </div>

      {/* Color */}
      <div>
        <label className="block text-[10px] font-display tracking-wider text-vanzemla-text-dim uppercase mb-1">
          Color
        </label>
        <ColorPicker
          value={region.color}
          onChange={(color) => updateRegion(regionId, { color })}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-[10px] font-display tracking-wider text-vanzemla-text-dim uppercase mb-1">
          Description
        </label>
        <MarkdownField
          value={region.description}
          onChange={(description) => updateRegion(regionId, { description })}
          placeholder="Region lore, history, notes..."
        />
      </div>

      {/* Pins in region */}
      <div>
        <label className="block text-[10px] font-display tracking-wider text-vanzemla-text-dim uppercase mb-2">
          Pins ({pins.length})
        </label>
        {pins.length === 0 ? (
          <p className="text-xs text-vanzemla-text-dim italic">
            Double-click on the map to place a pin
          </p>
        ) : (
          <div className="space-y-1">
            {pins.map((pin) => (
              <button
                key={pin.id}
                onClick={() => onPanelChange({ type: "pin", pinId: pin.id })}
                className="w-full flex items-center gap-2 px-3 py-2 bg-vanzemla-bg border border-vanzemla-border rounded text-sm text-vanzemla-text hover:border-vanzemla-accent transition-colors text-left"
              >
                {pin.type === "city" ? (
                  <Building2 size={14} className="text-vanzemla-accent-bright shrink-0" />
                ) : (
                  <MapPin size={14} className="text-vanzemla-text-dim shrink-0" />
                )}
                <span className="truncate">{pin.label}</span>
                {pin.images.length > 0 && (
                  <span className="text-[10px] text-vanzemla-text-dim ml-auto shrink-0">
                    {pin.images.length} img
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

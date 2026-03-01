"use client";

import { useMap } from "@/lib/MapContext";
import MarkdownField from "./MarkdownField";
import ImageUpload from "./ImageUpload";
import { Trash2, MapPin, Building2 } from "lucide-react";

interface PinEditorProps {
  pinId: string;
}

export default function PinEditor({ pinId }: PinEditorProps) {
  const { state, updatePin, deletePin, addImage, removeImage, getPinsInCity } =
    useMap();
  const pin = state.pins.find((p) => p.id === pinId);

  if (!pin) {
    return (
      <div className="p-4 text-vanzemla-text-dim text-sm italic">
        Pin not found
      </div>
    );
  }

  const childPins = pin.type === "city" ? getPinsInCity(pinId) : [];

  return (
    <div className="p-4 space-y-5">
      {/* Pin label */}
      <div>
        <label className="block text-[10px] font-display tracking-wider text-vanzemla-text-dim uppercase mb-1">
          Label
        </label>
        <input
          type="text"
          value={pin.label}
          onChange={(e) => updatePin(pinId, { label: e.target.value })}
          placeholder="Pin name"
          className="w-full px-3 py-2 bg-vanzemla-bg border border-vanzemla-border rounded text-sm text-vanzemla-text focus:outline-none focus:border-vanzemla-accent"
        />
      </div>

      {/* Type toggle */}
      <div>
        <label className="block text-[10px] font-display tracking-wider text-vanzemla-text-dim uppercase mb-1">
          Type
        </label>
        <div className="flex gap-1">
          <button
            onClick={() => updatePin(pinId, { type: "pin" })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-display tracking-wider ${
              pin.type === "pin"
                ? "bg-vanzemla-accent/20 text-vanzemla-accent-bright"
                : "text-vanzemla-text-dim hover:text-vanzemla-text bg-vanzemla-bg border border-vanzemla-border"
            }`}
          >
            <MapPin size={12} /> PIN
          </button>
          <button
            onClick={() => updatePin(pinId, { type: "city" })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-display tracking-wider ${
              pin.type === "city"
                ? "bg-vanzemla-accent/20 text-vanzemla-accent-bright"
                : "text-vanzemla-text-dim hover:text-vanzemla-text bg-vanzemla-bg border border-vanzemla-border"
            }`}
          >
            <Building2 size={12} /> CITY
          </button>
        </div>
      </div>

      {/* Content / lore */}
      <div>
        <label className="block text-[10px] font-display tracking-wider text-vanzemla-text-dim uppercase mb-1">
          Content
        </label>
        <MarkdownField
          value={pin.content}
          onChange={(content) => updatePin(pinId, { content })}
          placeholder="Lore, notes, details..."
        />
      </div>

      {/* Images */}
      <div>
        <label className="block text-[10px] font-display tracking-wider text-vanzemla-text-dim uppercase mb-1">
          Images ({pin.images.length})
        </label>
        <ImageUpload
          images={pin.images}
          onAdd={(file) => addImage(pinId, file)}
          onRemove={(imageId) => removeImage(pinId, imageId)}
        />
      </div>

      {/* City children */}
      {pin.type === "city" && (
        <div>
          <label className="block text-[10px] font-display tracking-wider text-vanzemla-text-dim uppercase mb-2">
            Child Pins ({childPins.length})
          </label>
          {childPins.length === 0 ? (
            <p className="text-xs text-vanzemla-text-dim italic">
              No child pins yet
            </p>
          ) : (
            <div className="space-y-1">
              {childPins.map((cp) => (
                <div
                  key={cp.id}
                  className="flex items-center gap-2 px-3 py-2 bg-vanzemla-bg border border-vanzemla-border rounded text-sm text-vanzemla-text"
                >
                  <MapPin size={12} className="text-vanzemla-text-dim shrink-0" />
                  <span className="truncate">{cp.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete button */}
      <div className="pt-2 border-t border-vanzemla-border">
        <button
          onClick={() => deletePin(pinId)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
        >
          <Trash2 size={12} /> Delete Pin
        </button>
      </div>
    </div>
  );
}

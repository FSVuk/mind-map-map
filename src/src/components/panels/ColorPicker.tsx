"use client";

import { MUTED_PALETTE } from "@/lib/colors";

const SWATCHES = Object.values(MUTED_PALETTE);

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div>
      <div className="grid grid-cols-8 gap-1 mb-2">
        {SWATCHES.map((color) => (
          <button
            key={color}
            className={`w-7 h-7 rounded-sm border-2 transition-transform hover:scale-110 ${
              value === color
                ? "border-vanzemla-accent-bright scale-110"
                : "border-transparent"
            }`}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
            title={color}
          />
        ))}
      </div>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
          }}
          className="flex-1 px-2 py-1 bg-vanzemla-bg border border-vanzemla-border rounded text-xs font-mono text-vanzemla-text"
          placeholder="#RRGGBB"
        />
      </div>
    </div>
  );
}

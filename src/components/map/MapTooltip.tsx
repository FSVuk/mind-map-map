"use client";

import type { TooltipData } from "@/types";

interface MapTooltipProps {
  data: TooltipData | null;
}

export default function MapTooltip({ data }: MapTooltipProps) {
  if (!data) return null;

  const { pin, screenX, screenY } = data;

  return (
    <div
      className="tooltip-enter fixed z-50 pointer-events-none"
      style={{
        left: screenX + 16,
        top: screenY - 8,
      }}
    >
      <div className="bg-vanzemla-sidebar/95 border border-vanzemla-border backdrop-blur-sm rounded-lg p-3 shadow-xl max-w-[220px]">
        {/* Thumbnail */}
        {pin.thumbnail && (
          <div className="w-full h-20 rounded overflow-hidden mb-2 bg-vanzemla-bg">
            <img
              src={pin.thumbnail}
              alt={pin.label}
              className="w-full h-full object-cover opacity-70"
            />
          </div>
        )}

        {/* Location name */}
        <p className="text-xs font-display tracking-[0.2em] text-vanzemla-text mb-1.5 uppercase">
          {pin.label}
        </p>

        {/* Tags */}
        {pin.tags && pin.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pin.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-display tracking-wider px-1.5 py-0.5 rounded bg-vanzemla-accent/15 text-vanzemla-accent-bright border border-vanzemla-accent/25"
              >
                [ {tag} ]
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

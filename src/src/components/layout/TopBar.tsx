"use client";

import { Menu, Search, Minus, Plus } from "lucide-react";

interface TopBarProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export default function TopBar({ zoomLevel, onZoomIn, onZoomOut }: TopBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-12 flex items-center justify-between px-4 z-40 bg-vanzemla-sidebar border-b border-vanzemla-border">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <button className="text-vanzemla-text-dim hover:text-vanzemla-text transition-colors">
          <Menu size={20} strokeWidth={1.5} />
        </button>
        <h1 className="text-lg tracking-[0.3em] font-display text-vanzemla-text select-none">
          VANZEMLA
        </h1>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="flex items-center gap-2 bg-vanzemla-bg/60 border border-vanzemla-border rounded px-3 py-1.5">
          <Search size={14} className="text-vanzemla-text-dim" strokeWidth={1.5} />
          <span className="text-xs text-vanzemla-text-dim font-display tracking-wider">
            Search:
          </span>
          <input
            type="text"
            className="bg-transparent text-xs text-vanzemla-text outline-none w-24 font-display"
            placeholder=""
          />
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onZoomOut}
            className="text-vanzemla-text-dim hover:text-vanzemla-text transition-colors"
          >
            <Minus size={16} strokeWidth={1.5} />
          </button>
          <span className="text-xs text-vanzemla-text-dim font-display tracking-wider min-w-[4rem] text-center">
            Zoom: {zoomLevel}%
          </span>
          <button
            onClick={onZoomIn}
            className="text-vanzemla-text-dim hover:text-vanzemla-text transition-colors"
          >
            <Plus size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
}

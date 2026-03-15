"use client";

import { Map, BookOpen, LayoutGrid, Settings } from "lucide-react";
import type { SidebarTab } from "@/types";

const tabs: { id: SidebarTab; icon: typeof Map; label: string; disabled?: boolean }[] = [
  { id: "map", icon: Map, label: "MAP VIEW" },
  { id: "library", icon: BookOpen, label: "LIBRARY", disabled: true },
  { id: "overlays", icon: LayoutGrid, label: "OVERLAYS", disabled: true },
  { id: "settings", icon: Settings, label: "SETTINGS", disabled: true },
];

interface SidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-12 bottom-0 w-16 flex flex-col items-center pt-3 gap-1 z-30 bg-vanzemla-sidebar border-r border-vanzemla-border">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={tab.disabled ? undefined : () => onTabChange(tab.id)}
            className={`
              w-14 flex flex-col items-center gap-0.5 py-2 rounded-md transition-colors
              ${
                tab.disabled
                  ? "opacity-30 cursor-not-allowed"
                  : isActive
                    ? "bg-vanzemla-accent/15 text-vanzemla-accent-bright"
                    : "text-vanzemla-text-dim hover:text-vanzemla-text hover:bg-white/5"
              }
            `}
            title={tab.disabled ? "Coming soon" : tab.label}
            disabled={tab.disabled}
          >
            <Icon size={20} strokeWidth={1.5} />
            <span className="text-[9px] font-display tracking-wider leading-tight">
              {tab.label}
            </span>
          </button>
        );
      })}
      <div className="flex-1" />
    </aside>
  );
}

"use client";

import { Map, BookOpen, LayoutGrid, Settings } from "lucide-react";
import type { SidebarTab } from "@/types";

const tabs: { id: SidebarTab; icon: typeof Map; label: string }[] = [
  { id: "map", icon: Map, label: "MAP VIEW" },
  { id: "library", icon: BookOpen, label: "LIBRARY" },
  { id: "overlays", icon: LayoutGrid, label: "OVERLAYS" },
  { id: "settings", icon: Settings, label: "SETTINGS" },
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
            onClick={() => onTabChange(tab.id)}
            className={`
              w-14 flex flex-col items-center gap-0.5 py-2 rounded-md transition-colors
              ${
                isActive
                  ? "bg-vanzemla-accent/15 text-vanzemla-accent-bright"
                  : "text-vanzemla-text-dim hover:text-vanzemla-text hover:bg-white/5"
              }
            `}
            title={tab.label}
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

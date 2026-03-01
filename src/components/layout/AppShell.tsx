"use client";

import { useState } from "react";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import type { SidebarTab } from "@/types";

interface AppShellProps {
  children: React.ReactNode;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  panelOpen?: boolean;
}

export default function AppShell({
  children,
  zoomLevel,
  onZoomIn,
  onZoomOut,
}: AppShellProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("map");

  return (
    <div className="h-screen w-screen overflow-hidden bg-vanzemla-bg">
      <TopBar zoomLevel={zoomLevel} onZoomIn={onZoomIn} onZoomOut={onZoomOut} />
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="absolute top-12 left-16 right-0 bottom-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

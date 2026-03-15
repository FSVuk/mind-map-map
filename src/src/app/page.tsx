"use client";

import { useState, useCallback, useRef } from "react";
import AppShell from "@/components/layout/AppShell";
import MapContainer from "@/components/map/MapContainer";
import DetailPanel from "@/components/panels/DetailPanel";
import type { MapContainerHandle } from "@/components/map/MapContainer";
import type { PanelMode } from "@/types";

export default function Home() {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [panelMode, setPanelMode] = useState<PanelMode>({ type: "none" });
  const mapRef = useRef<MapContainerHandle>(null);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  const handleClosePanel = useCallback(() => {
    setPanelMode({ type: "none" });
  }, []);

  return (
    <AppShell
      zoomLevel={zoomLevel}
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
      panelOpen={panelMode.type !== "none"}
    >
      <div className="flex h-full">
        <div className="flex-1 overflow-hidden">
          <MapContainer
            ref={mapRef}
            onZoomChange={setZoomLevel}
            panelMode={panelMode}
            onPanelChange={setPanelMode}
          />
        </div>
        <DetailPanel
          mode={panelMode}
          onClose={handleClosePanel}
          onPanelChange={setPanelMode}
        />
      </div>
    </AppShell>
  );
}

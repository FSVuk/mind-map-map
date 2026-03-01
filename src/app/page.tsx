"use client";

import { useState, useCallback, useRef } from "react";
import AppShell from "@/components/layout/AppShell";
import MapContainer from "@/components/map/MapContainer";
import type { MapContainerHandle } from "@/components/map/MapContainer";

export default function Home() {
  const [zoomLevel, setZoomLevel] = useState(100);
  const mapRef = useRef<MapContainerHandle>(null);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  return (
    <AppShell
      zoomLevel={zoomLevel}
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
    >
      <MapContainer ref={mapRef} onZoomChange={setZoomLevel} />
    </AppShell>
  );
}

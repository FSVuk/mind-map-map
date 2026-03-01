"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import MapRegions from "./MapRegions";
import MapPins from "./MapPins";
import MapTooltip from "./MapTooltip";
import CompassRose from "./CompassRose";
import { REGIONS } from "@/data/regions";
import { SAMPLE_PINS } from "@/data/pins";
import type { ViewBox, MapPin, TooltipData } from "@/types";

const BASE_W = 1567;
const BASE_H = 668;

export interface MapContainerHandle {
  zoomIn: () => void;
  zoomOut: () => void;
}

interface MapContainerProps {
  onZoomChange: (zoom: number) => void;
}

const MapContainer = forwardRef<MapContainerHandle, MapContainerProps>(
  function MapContainer({ onZoomChange }, ref) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewBox, setViewBox] = useState<ViewBox>({
    x: 0,
    y: 0,
    w: BASE_W,
    h: BASE_H,
  });

  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [viewBoxStart, setViewBoxStart] = useState({ x: 0, y: 0 });
  const [showOverlay, setShowOverlay] = useState(false);

  // Compute pin scale factor (inverse of zoom so pins stay constant screen size)
  const pinScale = viewBox.w / BASE_W;

  // Convert SVG coordinates to screen coordinates for tooltip positioning
  const svgToScreen = useCallback(
    (svgX: number, svgY: number): { x: number; y: number } => {
      const svgEl = svgRef.current;
      if (!svgEl) return { x: 0, y: 0 };
      const pt = svgEl.createSVGPoint();
      pt.x = svgX;
      pt.y = svgY;
      const ctm = svgEl.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const screenPt = pt.matrixTransform(ctm);
      return { x: screenPt.x, y: screenPt.y };
    },
    []
  );

  // Zoom handler
  const handleZoom = useCallback(
    (direction: "in" | "out", centerX?: number, centerY?: number) => {
      setViewBox((prev) => {
        const factor = direction === "in" ? 0.8 : 1.25;
        const newW = Math.max(200, Math.min(BASE_W, prev.w * factor));
        const newH = Math.max(85, Math.min(BASE_H, prev.h * factor));

        // Zoom toward center point (or viewBox center if not specified)
        const cx = centerX ?? prev.x + prev.w / 2;
        const cy = centerY ?? prev.y + prev.h / 2;

        const ratioX = (cx - prev.x) / prev.w;
        const ratioY = (cy - prev.y) / prev.h;

        let newX = cx - newW * ratioX;
        let newY = cy - newH * ratioY;

        // Clamp to boundaries
        newX = Math.max(-100, Math.min(BASE_W - newW + 100, newX));
        newY = Math.max(-50, Math.min(BASE_H - newH + 50, newY));

        const zoom = Math.round((BASE_W / newW) * 100);
        onZoomChange(zoom);

        return { x: newX, y: newY, w: newW, h: newH };
      });
    },
    [onZoomChange]
  );

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const svgEl = svgRef.current;
      if (!svgEl) return;

      const rect = svgEl.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Convert screen position to SVG coordinate
      const svgX = viewBox.x + (mouseX / rect.width) * viewBox.w;
      const svgY = viewBox.y + (mouseY / rect.height) * viewBox.h;

      handleZoom(e.deltaY < 0 ? "in" : "out", svgX, svgY);
    },
    [handleZoom, viewBox]
  );

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setViewBoxStart({ x: viewBox.x, y: viewBox.y });
    },
    [viewBox.x, viewBox.y]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      const svgEl = svgRef.current;
      if (!svgEl) return;

      const rect = svgEl.getBoundingClientRect();
      const dx = ((e.clientX - panStart.x) / rect.width) * viewBox.w;
      const dy = ((e.clientY - panStart.y) / rect.height) * viewBox.h;

      let newX = viewBoxStart.x - dx;
      let newY = viewBoxStart.y - dy;

      // Clamp
      newX = Math.max(-100, Math.min(BASE_W - viewBox.w + 100, newX));
      newY = Math.max(-50, Math.min(BASE_H - viewBox.h + 50, newY));

      setViewBox((prev) => ({ ...prev, x: newX, y: newY }));
    },
    [isPanning, panStart, viewBoxStart, viewBox.w, viewBox.h]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Region interaction
  const handleRegionClick = useCallback((id: string) => {
    console.log(`Region clicked: ${id}`);
    setActiveRegion((prev) => (prev === id ? null : id));
  }, []);

  const handleRegionHover = useCallback((id: string | null) => {
    setHoveredRegion(id);
  }, []);

  // Pin interaction
  const handlePinClick = useCallback((pin: MapPin) => {
    console.log(`Pin clicked: ${pin.id} - ${pin.label}`);
  }, []);

  const handlePinHover = useCallback(
    (pin: MapPin | null) => {
      if (pin) {
        const screen = svgToScreen(pin.x, pin.y);
        setTooltip({ pin, screenX: screen.x, screenY: screen.y });
      } else {
        setTooltip(null);
      }
    },
    [svgToScreen]
  );

  // Expose zoom in/out for TopBar via ref
  useImperativeHandle(ref, () => ({
    zoomIn: () => handleZoom("in"),
    zoomOut: () => handleZoom("out"),
  }), [handleZoom]);

  // Toggle dev overlay with 'D' key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "d" && e.ctrlKey) {
        e.preventDefault();
        setShowOverlay((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const viewBoxStr = `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`;

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg
        ref={svgRef}
        viewBox={viewBoxStr}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full select-none"
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Definitions */}
        <defs>
          <pattern
            id="grid"
            width={40}
            height={40}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#1A2540"
              strokeWidth={0.5}
            />
          </pattern>
          <filter id="region-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ocean background */}
        <rect x={-200} y={-100} width={BASE_W + 400} height={BASE_H + 200} fill="#0B1120" />

        {/* Grid pattern */}
        <rect x={-200} y={-100} width={BASE_W + 400} height={BASE_H + 200} fill="url(#grid)" />

        {/* Dev overlay: source map at reduced opacity */}
        {showOverlay && (
          <image
            href="/images/map_regions.png"
            x={0}
            y={0}
            width={BASE_W}
            height={BASE_H}
            opacity={0.35}
          />
        )}

        {/* Regions */}
        <MapRegions
          regions={REGIONS}
          hoveredRegion={hoveredRegion}
          activeRegion={activeRegion}
          onRegionClick={handleRegionClick}
          onRegionHover={handleRegionHover}
        />

        {/* Pins */}
        <MapPins
          pins={SAMPLE_PINS}
          scale={pinScale}
          onPinClick={handlePinClick}
          onPinHover={handlePinHover}
        />

        {/* Compass Rose */}
        <CompassRose scale={pinScale} />
      </svg>

      {/* Tooltip (HTML overlay) */}
      <MapTooltip data={tooltip} />

      {/* Dev mode indicator */}
      {showOverlay && (
        <div className="absolute top-2 right-2 bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-[10px] font-display tracking-wider px-2 py-1 rounded">
          DEV OVERLAY (Ctrl+D)
        </div>
      )}
    </div>
  );
});

export default MapContainer;

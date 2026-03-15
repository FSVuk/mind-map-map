"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useMap } from "@/lib/MapContext";
import { useAuth } from "@/lib/AuthContext";
import {
  REGION_PATHS,
  WATER_PATH,
  BORDER_PATH,
  MAP_WIDTH,
  MAP_HEIGHT,
  OCEAN_COLOR,
} from "@/data/map-paths";
import MapPins from "./MapPins";
import type { ViewBox, PanelMode, Pin } from "@/types";

const BASE_W = MAP_WIDTH;
const BASE_H = MAP_HEIGHT;
const ZOOM_PADDING = 0.15;

export interface MapContainerHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

interface MapContainerProps {
  onZoomChange: (zoom: number) => void;
  panelMode: PanelMode;
  onPanelChange: (mode: PanelMode) => void;
}

const MapContainer = forwardRef<MapContainerHandle, MapContainerProps>(
  function MapContainer({ onZoomChange, panelMode, onPanelChange }, ref) {
    const { getRegionData, state, addPin } = useMap();
    const { role } = useAuth();
    const isAuthor = role === "author";
    const svgRef = useRef<SVGSVGElement>(null);

    const defaultViewBox: ViewBox = { x: 0, y: 0, w: BASE_W, h: BASE_H };
    const [viewBox, setViewBox] = useState<ViewBox>(defaultViewBox);
    const [targetViewBox, setTargetViewBox] = useState<ViewBox | null>(null);

    const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [viewBoxStart, setViewBoxStart] = useState({ x: 0, y: 0 });
    const [hasDragged, setHasDragged] = useState(false);

    const activeRegionId =
      panelMode.type === "region" ? panelMode.regionId : null;

    const pinScale = viewBox.w / BASE_W;

    // ── Animated zoom ─────────────────────────────────────────────
    useEffect(() => {
      if (!targetViewBox) return;
      const start = { ...viewBox };
      const end = targetViewBox;
      const duration = 400;
      const startTime = performance.now();
      const ease = (t: number) =>
        t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      let rafId: number;
      function animate(now: number) {
        const t = Math.min(1, (now - startTime) / duration);
        const e = ease(t);
        const cur: ViewBox = {
          x: start.x + (end.x - start.x) * e,
          y: start.y + (end.y - start.y) * e,
          w: start.w + (end.w - start.w) * e,
          h: start.h + (end.h - start.h) * e,
        };
        setViewBox(cur);
        onZoomChange(Math.round((BASE_W / cur.w) * 100));
        if (t < 1) rafId = requestAnimationFrame(animate);
        else setTargetViewBox(null);
      }
      rafId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(rafId);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetViewBox]);

    // ── Zoom to region bbox ───────────────────────────────────────
    const zoomToRegion = useCallback((regionId: string) => {
      const svgEl = svgRef.current;
      if (!svgEl) return;
      const pathEl = svgEl.querySelector(
        `[data-region-id="${regionId}"]`
      ) as SVGPathElement | null;
      if (!pathEl) return;

      const bbox = pathEl.getBBox();
      const padW = bbox.width * ZOOM_PADDING;
      const padH = bbox.height * ZOOM_PADDING;
      let tw = bbox.width + padW * 2;
      let th = bbox.height + padH * 2;

      const rect = svgEl.getBoundingClientRect();
      const aspect = rect.width / rect.height;
      if (tw / th > aspect) th = tw / aspect;
      else tw = th * aspect;

      tw = Math.max(tw, BASE_W / 5);
      th = Math.max(th, BASE_H / 5);

      setTargetViewBox({
        x: bbox.x + bbox.width / 2 - tw / 2,
        y: bbox.y + bbox.height / 2 - th / 2,
        w: tw,
        h: th,
      });
    }, []);

    const resetView = useCallback(() => {
      setTargetViewBox(defaultViewBox);
      onPanelChange({ type: "none" });
    }, [onPanelChange]);

    // ── Manual zoom ───────────────────────────────────────────────
    const handleZoom = useCallback(
      (dir: "in" | "out", cx?: number, cy?: number) => {
        setViewBox((prev) => {
          const f = dir === "in" ? 0.8 : 1.25;
          const nw = Math.max(BASE_W / 8, Math.min(BASE_W, prev.w * f));
          const nh = Math.max(BASE_H / 8, Math.min(BASE_H, prev.h * f));
          const px = cx ?? prev.x + prev.w / 2;
          const py = cy ?? prev.y + prev.h / 2;
          // Schedule zoom level update outside the setState updater
          queueMicrotask(() => onZoomChange(Math.round((BASE_W / nw) * 100)));
          return {
            x: px - nw * ((px - prev.x) / prev.w),
            y: py - nh * ((py - prev.y) / prev.h),
            w: nw,
            h: nh,
          };
        });
      },
      [onZoomChange]
    );

    const handleWheel = useCallback(
      (e: React.WheelEvent) => {
        e.preventDefault();
        const el = svgRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        handleZoom(
          e.deltaY < 0 ? "in" : "out",
          viewBox.x + ((e.clientX - r.left) / r.width) * viewBox.w,
          viewBox.y + ((e.clientY - r.top) / r.height) * viewBox.h
        );
      },
      [handleZoom, viewBox]
    );

    // ── Pan ───────────────────────────────────────────────────────
    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setIsPanning(true);
        setHasDragged(false);
        setPanStart({ x: e.clientX, y: e.clientY });
        setViewBoxStart({ x: viewBox.x, y: viewBox.y });
      },
      [viewBox.x, viewBox.y]
    );

    const handleMouseMove = useCallback(
      (e: React.MouseEvent) => {
        if (!isPanning) return;
        const el = svgRef.current;
        if (!el) return;
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) setHasDragged(true);
        const r = el.getBoundingClientRect();
        setViewBox((prev) => ({
          ...prev,
          x: viewBoxStart.x - (dx / r.width) * viewBox.w,
          y: viewBoxStart.y - (dy / r.height) * viewBox.h,
        }));
      },
      [isPanning, panStart, viewBoxStart, viewBox.w, viewBox.h]
    );

    const handleMouseUp = useCallback(() => setIsPanning(false), []);

    // ── Region click ──────────────────────────────────────────────
    const handleRegionClick = useCallback(
      (regionId: string) => {
        if (hasDragged) return;
        if (activeRegionId === regionId) return;
        onPanelChange({ type: "region", regionId });
        zoomToRegion(regionId);
      },
      [hasDragged, activeRegionId, onPanelChange, zoomToRegion]
    );

    const handlePinClick = useCallback(
      (pin: Pin) => {
        if (hasDragged) return;
        onPanelChange({ type: "pin", pinId: pin.id });
      },
      [hasDragged, onPanelChange]
    );

    // ── Double-click to place pin (author only) ──────────────────
    const handleDoubleClick = useCallback(
      (e: React.MouseEvent) => {
        if (!isAuthor) return;
        if (!activeRegionId) return;
        const el = svgRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const sx = viewBox.x + ((e.clientX - r.left) / r.width) * viewBox.w;
        const sy = viewBox.y + ((e.clientY - r.top) / r.height) * viewBox.h;

        const newPin = addPin({
          type: "pin",
          x: sx,
          y: sy,
          label: "New Pin",
          content: "",
          regionId: activeRegionId,
          images: [],
        });
        onPanelChange({ type: "pin", pinId: newPin.id });
      },
      [isAuthor, activeRegionId, viewBox, addPin, onPanelChange]
    );

    useImperativeHandle(ref, () => ({
      zoomIn: () => handleZoom("in"),
      zoomOut: () => handleZoom("out"),
      resetView,
    }), [handleZoom, resetView]);

    useEffect(() => {
      const h = (e: KeyboardEvent) => { if (e.key === "Escape") resetView(); };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }, [resetView]);

    return (
      <div className="w-full h-full relative">
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full select-none"
          style={{ cursor: isPanning ? "grabbing" : "grab" }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        >
          <rect x={-500} y={-500} width={BASE_W + 1000} height={BASE_H + 1000} fill={OCEAN_COLOR} />

          <g id="regions">
            {REGION_PATHS.map((rp) => {
              const rd = getRegionData(rp.id);
              const hovered = hoveredRegion === rp.id;
              const active = activeRegionId === rp.id;
              return (
                <path
                  key={rp.id}
                  data-region-id={rp.id}
                  d={rp.d}
                  fill={rd.color}
                  fillRule="evenodd"
                  className="transition-[filter] duration-150"
                  style={{
                    filter: hovered ? "brightness(1.3)" : undefined,
                    cursor: "pointer",
                  }}
                  onClick={(e) => { e.stopPropagation(); handleRegionClick(rp.id); }}
                  onMouseEnter={() => setHoveredRegion(rp.id)}
                  onMouseLeave={() => setHoveredRegion(null)}
                >
                  <title>{rd.name || `Region ${rp.id}`}</title>
                </path>
              );
            })}
          </g>

          {/* Selection outline overlay — rendered above regions so it isn't clipped */}
          {activeRegionId && (() => {
            const activeRP = REGION_PATHS.find((rp) => rp.id === activeRegionId);
            if (!activeRP) return null;
            const outlineWidth = Math.max(2, viewBox.w * 0.003);
            return (
              <path
                d={activeRP.d}
                fill="none"
                fillRule="evenodd"
                stroke="#FFD700"
                strokeWidth={outlineWidth}
                strokeLinejoin="round"
                style={{ pointerEvents: "none" }}
              />
            );
          })()}

          {WATER_PATH && <path d={WATER_PATH} fill={OCEAN_COLOR} fillRule="evenodd" style={{ pointerEvents: "none" }} />}
          {BORDER_PATH && <path d={BORDER_PATH} fill="#000000" fillRule="evenodd" style={{ pointerEvents: "none" }} />}

          <MapPins
            pins={state.pins}
            scale={pinScale}
            onPinClick={handlePinClick}
            activePinId={panelMode.type === "pin" ? panelMode.pinId : null}
          />
        </svg>

        {activeRegionId && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-vanzemla-sidebar/90 border border-vanzemla-border text-vanzemla-text-dim text-xs px-3 py-1.5 rounded-md pointer-events-none">
            {isAuthor ? "Double-click to place a pin · " : ""}Esc to return
          </div>
        )}
      </div>
    );
  }
);

export default MapContainer;

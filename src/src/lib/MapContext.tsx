"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { AppState, RegionData, Pin, ImageAttachment } from "@/types";
import { loadState, saveState, getRegion, createDefaultState } from "./store";

interface MapContextValue {
  state: AppState;

  // Region actions
  getRegionData: (regionId: string) => RegionData;
  updateRegion: (regionId: string, data: Partial<RegionData>) => void;

  // Pin actions
  addPin: (pin: Omit<Pin, "id">) => Pin;
  updatePin: (pinId: string, data: Partial<Pin>) => void;
  deletePin: (pinId: string) => void;
  getPinsInRegion: (regionId: string) => Pin[];
  getPinsInCity: (cityId: string) => Pin[];

  // Image actions
  addImage: (pinId: string, file: File) => Promise<void>;
  removeImage: (pinId: string, imageId: string) => void;
}

const noop = () => {};
const defaultState = createDefaultState();
const defaultCtx: MapContextValue = {
  state: defaultState,
  getRegionData: (id: string) => getRegion(defaultState, id),
  updateRegion: noop as MapContextValue["updateRegion"],
  addPin: (() => ({ id: "", type: "pin", x: 0, y: 0, label: "", content: "", regionId: "", images: [] })) as MapContextValue["addPin"],
  updatePin: noop as MapContextValue["updatePin"],
  deletePin: noop as MapContextValue["deletePin"],
  getPinsInRegion: () => [],
  getPinsInCity: () => [],
  addImage: (async () => {}) as MapContextValue["addImage"],
  removeImage: noop as MapContextValue["removeImage"],
};

const MapContext = createContext<MapContextValue>(defaultCtx);

export function MapProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(createDefaultState);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setState(loadState());
    setLoaded(true);
  }, []);

  // Auto-save on state changes (skip initial load)
  useEffect(() => {
    if (loaded) {
      saveState(state);
    }
  }, [state, loaded]);

  const getRegionData = useCallback(
    (regionId: string) => getRegion(state, regionId),
    [state]
  );

  const updateRegion = useCallback(
    (regionId: string, data: Partial<RegionData>) => {
      setState((prev) => ({
        ...prev,
        regions: {
          ...prev.regions,
          [regionId]: {
            ...getRegion(prev, regionId),
            ...data,
          },
        },
      }));
    },
    []
  );

  const addPin = useCallback((pinData: Omit<Pin, "id">): Pin => {
    let newPin: Pin = null!;
    setState((prev) => {
      newPin = { ...pinData, id: `pin_${prev.nextPinId}` } as Pin;
      return {
        ...prev,
        pins: [...prev.pins, newPin],
        nextPinId: prev.nextPinId + 1,
      };
    });
    return newPin;
  }, []);

  const updatePin = useCallback((pinId: string, data: Partial<Pin>) => {
    setState((prev) => ({
      ...prev,
      pins: prev.pins.map((p) => (p.id === pinId ? { ...p, ...data } : p)),
    }));
  }, []);

  const deletePin = useCallback((pinId: string) => {
    setState((prev) => ({
      ...prev,
      // Also delete child pins of a city
      pins: prev.pins.filter(
        (p) => p.id !== pinId && p.parentCityId !== pinId
      ),
    }));
  }, []);

  const getPinsInRegion = useCallback(
    (regionId: string) =>
      state.pins.filter(
        (p) => p.regionId === regionId && !p.parentCityId
      ),
    [state.pins]
  );

  const getPinsInCity = useCallback(
    (cityId: string) =>
      state.pins.filter((p) => p.parentCityId === cityId),
    [state.pins]
  );

  const addImage = useCallback(
    async (pinId: string, file: File) => {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const img: ImageAttachment = {
        id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        filename: file.name,
        dataUrl,
      };

      setState((prev) => ({
        ...prev,
        pins: prev.pins.map((p) =>
          p.id === pinId ? { ...p, images: [...p.images, img] } : p
        ),
      }));
    },
    []
  );

  const removeImage = useCallback((pinId: string, imageId: string) => {
    setState((prev) => ({
      ...prev,
      pins: prev.pins.map((p) =>
        p.id === pinId
          ? { ...p, images: p.images.filter((i) => i.id !== imageId) }
          : p
      ),
    }));
  }, []);

  return (
    <MapContext.Provider
      value={{
        state,
        getRegionData,
        updateRegion,
        addPin,
        updatePin,
        deletePin,
        getPinsInRegion,
        getPinsInCity,
        addImage,
        removeImage,
      }}
    >
      {children}
    </MapContext.Provider>
  );
}

export function useMap() {
  return useContext(MapContext);
}

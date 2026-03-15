import type { AppState, RegionData } from "@/types";

const STORAGE_KEY = "vanzemla-state";

const DEFAULT_REGION: RegionData = {
  name: "",
  color: "#F0EDE8",
  description: "",
};

export function createDefaultState(): AppState {
  return {
    regions: {},
    pins: [],
    nextPinId: 1,
  };
}

export function loadState(): AppState {
  if (typeof window === "undefined") return createDefaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    return JSON.parse(raw) as AppState;
  } catch {
    return createDefaultState();
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save state:", e);
  }
}

export function getRegion(state: AppState, regionId: string): RegionData {
  return state.regions[regionId] ?? { ...DEFAULT_REGION };
}

export function getStorageUsage(): { used: number; limit: number } {
  if (typeof window === "undefined") return { used: 0, limit: 5_000_000 };
  let used = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      used += key.length + (localStorage.getItem(key)?.length ?? 0);
    }
  }
  return { used: used * 2, limit: 5_000_000 }; // *2 for UTF-16 chars
}

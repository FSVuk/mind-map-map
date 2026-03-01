import type { AppState, RegionData, Pin, ImageAttachment } from "@/types";

const STORAGE_KEY = "vanzemla-state";
const DEFAULT_REGION_COLOR = "#F0EDE8";

export function createDefaultState(): AppState {
  return {
    regions: {},
    pins: [],
    nextPinId: 1,
  };
}

export function getRegion(
  state: AppState,
  regionId: string
): RegionData {
  return (
    state.regions[regionId] ?? {
      name: "",
      color: DEFAULT_REGION_COLOR,
      description: "",
    }
  );
}

export function loadState(): AppState {
  if (typeof window === "undefined") return createDefaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw) as AppState;
    // Basic validation
    if (!parsed.regions || !Array.isArray(parsed.pins)) {
      return createDefaultState();
    }
    return parsed;
  } catch {
    return createDefaultState();
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save state to localStorage:", e);
  }
}

export function getStorageUsage(): { used: number; total: number } {
  if (typeof window === "undefined") return { used: 0, total: 5_000_000 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? "";
    return { used: raw.length * 2, total: 5_000_000 }; // rough estimate, chars * 2 bytes
  } catch {
    return { used: 0, total: 5_000_000 };
  }
}

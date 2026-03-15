import type { AppState, RegionData } from "@/types";

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

// ── API client functions ──────────────────────────────────────────

export async function fetchState(): Promise<AppState> {
  const res = await fetch("/api/state");
  if (!res.ok) return createDefaultState();
  return res.json();
}

export async function persistState(state: AppState): Promise<void> {
  await fetch("/api/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
}

export async function uploadImage(file: File): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/images/upload", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

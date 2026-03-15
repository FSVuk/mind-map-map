"use client";

import { MapProvider } from "@/lib/MapContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <MapProvider>{children}</MapProvider>;
}

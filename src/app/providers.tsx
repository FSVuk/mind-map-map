"use client";

import { MapProvider } from "@/lib/MapContext";
import { AuthProvider } from "@/lib/AuthContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <MapProvider>{children}</MapProvider>
    </AuthProvider>
  );
}

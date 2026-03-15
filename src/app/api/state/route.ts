import { NextRequest, NextResponse } from "next/server";
import { loadAppState, saveAppState } from "@/lib/db";

export async function GET() {
  try {
    const state = await loadAppState();
    return NextResponse.json(state);
  } catch (e) {
    console.error("Failed to load state:", e);
    return NextResponse.json({ error: "Failed to load state" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  // Only authors can save
  const role = req.cookies.get("vanzemla-role")?.value;
  if (role !== "author") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const state = await req.json();
    await saveAppState(state);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to save state:", e);
    return NextResponse.json({ error: "Failed to save state" }, { status: 500 });
  }
}

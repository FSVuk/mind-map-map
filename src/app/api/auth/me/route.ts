import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const role = req.cookies.get("vanzemla-role")?.value;
  if (!role || (role !== "reader" && role !== "author")) {
    return NextResponse.json({ role: null }, { status: 401 });
  }
  return NextResponse.json({ role });
}

import { NextRequest, NextResponse } from "next/server";

const ROLES: Record<string, string> = {
  Archivist: "reader",
  Author: "author",
};

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const role = ROLES[password];

  if (!role) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const res = NextResponse.json({ role });
  res.cookies.set("vanzemla-role", role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}

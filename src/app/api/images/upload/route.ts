import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Only authors can upload
  const role = req.cookies.get("vanzemla-role")?.value;
  if (role !== "author") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // If Vercel Blob is configured, upload there
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob");
      const blob = await put(file.name, file, { access: "public" });
      return NextResponse.json({ url: blob.url, filename: file.name });
    }

    // Fallback: convert to data URL (local dev)
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;
    return NextResponse.json({ url: dataUrl, filename: file.name });
  } catch (e) {
    console.error("Image upload failed:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

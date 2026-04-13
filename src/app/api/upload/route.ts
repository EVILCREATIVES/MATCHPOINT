import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

const MAX_SIZE_MB = parseInt(process.env.UPLOAD_MAX_SIZE_MB || "50", 10);
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const ALLOWED_TYPES = ["application/pdf"];

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PDF files are allowed" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File size exceeds ${MAX_SIZE_MB} MB limit` },
      { status: 400 }
    );
  }

  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_");

  const blob = await put(`sources/${Date.now()}-${safeName}`, file, {
    access: "private" as "public",
    addRandomSuffix: true,
  });

  return NextResponse.json({
    url: blob.url,
    pathname: blob.pathname,
    size: file.size,
    filename: file.name,
  });
}

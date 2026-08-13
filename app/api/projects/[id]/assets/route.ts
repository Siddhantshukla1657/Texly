import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getAuthContext, checkProjectAccess } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Asset } from "@/lib/models";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { access } = await checkProjectAccess(id, "editor");
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });

    const customFilename = (formData.get("filename") as string) || file.name;
    const filename = customFilename.replace(/[^a-zA-Z0-9._\-/]/g, "_");

    let blobUrl = "";
    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(`projects/${id}/${filename}`, file, { access: "public" });
        blobUrl = blob.url;
      } else {
        throw new Error("BLOB_READ_WRITE_TOKEN not set");
      }
    } catch {
      // Fallback: convert to base64 Data URL if Blob storage is not configured
      const buffer = Buffer.from(await file.arrayBuffer());
      const mime = file.type || "application/octet-stream";
      blobUrl = `data:${mime};base64,${buffer.toString("base64")}`;
    }

    await connectDB();
    const asset = await Asset.create({
      projectId: id,
      filename,
      blobUrl,
      sizeBytes: file.size,
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Asset upload failed";
    console.error("Asset upload error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { access } = await checkProjectAccess(id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const assets = await Asset.find({ projectId: id }).sort({ createdAt: -1 });
  return NextResponse.json({ assets });
}

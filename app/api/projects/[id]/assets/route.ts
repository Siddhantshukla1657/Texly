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
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { access } = await checkProjectAccess(id, "editor");
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });

  const filename = file.name.replace(/[^a-zA-Z0-9._\-]/g, "_");

  const blob = await put(`projects/${id}/${filename}`, file, { access: "public" });

  await connectDB();
  const asset = await Asset.create({
    projectId: id,
    filename,
    blobUrl: blob.url,
    sizeBytes: file.size,
  });

  return NextResponse.json({ asset }, { status: 201 });
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

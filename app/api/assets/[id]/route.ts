import { NextResponse } from "next/server";
import { getAuthContext, checkProjectAccess } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Asset } from "@/lib/models";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const asset = await Asset.findById(id);
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  const { access, role } = await checkProjectAccess(asset.projectId.toString(), "editor");
  if (!access || (role !== "editor" && !ctx.isAdmin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { filename } = await request.json();
  if (filename !== undefined) {
    asset.filename = filename;
    await asset.save();
  }

  return NextResponse.json({ asset });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const asset = await Asset.findById(id);
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  const { access, role } = await checkProjectAccess(asset.projectId.toString(), "editor");
  if (!access || (role !== "editor" && !ctx.isAdmin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await asset.deleteOne();
  return NextResponse.json({ ok: true });
}

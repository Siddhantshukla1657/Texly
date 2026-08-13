import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { File, ProjectAccess } from "@/lib/models";
import { Types } from "mongoose";

async function canEditFile(fileId: string, userId: Types.ObjectId, isAdmin: boolean) {
  const file = await File.findById(fileId);
  if (!file) return { ok: false, file: null };
  if (isAdmin) return { ok: true, file };

  const grant = await ProjectAccess.findOne({
    projectId: file.projectId,
    userId,
    status: "active",
    role: "editor",
  });
  return { ok: !!grant, file };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { ok, file } = await canEditFile(id, ctx.user._id, ctx.isAdmin);
  if (!ok || !file) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { content, filename, isMainTex } = await request.json();

  if (content !== undefined) file.content = content;
  if (filename !== undefined) file.filename = filename;
  if (isMainTex !== undefined) {
    if (isMainTex) {
      await File.updateMany({ projectId: file.projectId }, { isMainTex: false });
    }
    file.isMainTex = isMainTex;
  }

  await file.save();
  return NextResponse.json({ file });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { ok, file } = await canEditFile(id, ctx.user._id, ctx.isAdmin);
  if (!ok || !file) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (file.isMainTex) {
    return NextResponse.json({ error: "Cannot delete the main tex file" }, { status: 400 });
  }

  await file.deleteOne();
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getAuthContext, checkProjectAccess } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Project, File, Asset, Commit, ProjectAccess } from "@/lib/models";

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
  const project = await Project.findById(id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const files = await File.find({ projectId: id }).sort({ isMainTex: -1, filename: 1 });
  const assets = await Asset.find({ projectId: id }).sort({ createdAt: -1 });

  return NextResponse.json({ project, files, assets });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const { name } = await request.json();
  const project = await Project.findByIdAndUpdate(id, { name }, { new: true });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ project });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  await Project.findByIdAndDelete(id);
  await File.deleteMany({ projectId: id });
  await Asset.deleteMany({ projectId: id });
  await Commit.deleteMany({ projectId: id });
  await ProjectAccess.deleteMany({ projectId: id });

  return NextResponse.json({ ok: true });
}

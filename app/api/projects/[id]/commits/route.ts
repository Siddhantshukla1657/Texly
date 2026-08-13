import { NextResponse } from "next/server";
import { getAuthContext, checkProjectAccess } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Commit, File, Project } from "@/lib/models";

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
  const commits = await Commit.find({ projectId: id })
    .populate("authorId", "username email")
    .sort({ createdAt: -1 });

  return NextResponse.json({ commits });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { access } = await checkProjectAccess(id, "editor");
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();

  const { message } = await request.json();
  const commitMessage = (message || `Snapshot — ${new Date().toISOString()}`).trim();

  const files = await File.find({ projectId: id });
  const fileSnapshots = files.map((f) => ({
    fileId: f._id,
    filename: f.filename,
    content: f.content,
  }));

  const commit = await Commit.create({
    projectId: id,
    authorId: ctx.user._id,
    message: commitMessage,
    files: fileSnapshots,
  });

  // Bump project updatedAt
  await Project.findByIdAndUpdate(id, { updatedAt: new Date() });

  return NextResponse.json({ commit }, { status: 201 });
}

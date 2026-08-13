import { NextResponse } from "next/server";
import { getAuthContext, checkProjectAccess } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Commit, File } from "@/lib/models";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const sourceCommit = await Commit.findById(id);
  if (!sourceCommit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { access } = await checkProjectAccess(sourceCommit.projectId.toString(), "editor");
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Restore files from commit
  for (const snapshot of sourceCommit.files) {
    await File.findByIdAndUpdate(
      snapshot.fileId,
      { content: snapshot.content, filename: snapshot.filename },
      { new: true }
    );
  }

  // Create a new commit for the restore event
  const newCommit = await Commit.create({
    projectId: sourceCommit.projectId,
    authorId: ctx.user._id,
    message: `Restore to: "${sourceCommit.message}"`,
    files: sourceCommit.files,
  });

  return NextResponse.json({ commit: newCommit });
}

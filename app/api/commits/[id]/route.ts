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

  await connectDB();
  const commit = await Commit.findById(id).populate("authorId", "username email");
  if (!commit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { access } = await checkProjectAccess(commit.projectId.toString());
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ commit });
}

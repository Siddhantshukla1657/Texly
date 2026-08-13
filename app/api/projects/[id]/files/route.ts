import { NextResponse } from "next/server";
import { getAuthContext, checkProjectAccess } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { File } from "@/lib/models";

// Allowed file extensions
const ALLOWED_EXT = [".tex", ".bib", ".cls", ".sty", ".txt", ".md"];

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-/]/g, "_").slice(0, 200);
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
  const files = await File.find({ projectId: id }).sort({ isMainTex: -1, filename: 1 });
  return NextResponse.json({ files });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { access, role } = await checkProjectAccess(id, "editor");
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { filename, content = "", isMainTex = false } = await request.json();

  const ext = "." + filename.split(".").pop();
  if (!ALLOWED_EXT.includes(ext)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }

  await connectDB();

  // If marking as main, unmark others
  if (isMainTex) {
    await File.updateMany({ projectId: id }, { isMainTex: false });
  }

  const file = await File.create({
    projectId: id,
    filename: sanitizeFilename(filename),
    content,
    isMainTex,
  });

  return NextResponse.json({ file }, { status: 201 });
}

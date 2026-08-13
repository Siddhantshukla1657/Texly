import { NextResponse } from "next/server";
import { getAuthContext, checkProjectAccess } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { File } from "@/lib/models";

// Allowed text file extensions
const ALLOWED_EXT = [
  ".tex", ".bib", ".cls", ".sty", ".txt", ".md",
  ".cfg", ".bst", ".def", ".clo", ".dtx", ".ins",
  ".eps", ".svg", ".png", ".jpg", ".jpeg", ".pdf"
];

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-/]/g, "_").slice(0, 200);
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { access } = await checkProjectAccess(id);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await connectDB();
    const files = await File.find({ projectId: id }).sort({ isMainTex: -1, filename: 1 });
    return NextResponse.json({ files });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

    const body = await request.json();
    const { filename, content = "", isMainTex } = body;

    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 });
    }

    const sanitized = sanitizeFilename(filename);
    const sanitizedLower = sanitized.toLowerCase();

    // Detect if this file should be marked as main.tex
    const shouldBeMain =
      isMainTex === true ||
      (isMainTex === undefined &&
        (sanitizedLower === "main.tex" ||
          sanitizedLower.endsWith("/main.tex") ||
          content.includes("\\documentclass")));

    await connectDB();

    // If marking as main, unmark others
    if (shouldBeMain) {
      await File.updateMany({ projectId: id }, { isMainTex: false });
    }

    // Upsert or create
    let file = await File.findOne({ projectId: id, filename: sanitized });
    if (file) {
      file.content = content;
      if (shouldBeMain) file.isMainTex = true;
      await file.save();
    } else {
      file = await File.create({
        projectId: id,
        filename: sanitized,
        content,
        isMainTex: !!shouldBeMain,
      });
    }

    return NextResponse.json({ file }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "File operation failed";
    console.error("Create file error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

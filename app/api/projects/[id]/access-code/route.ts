import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAuthContext, checkProjectAccess } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Project } from "@/lib/models";
import { generateAccessCode } from "@/lib/accessCode";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only project editors or admins can generate/regenerate access code
  const { access, role } = await checkProjectAccess(id);
  if (!access || (role !== "editor" && !ctx.isAdmin)) {
    return NextResponse.json({ error: "Forbidden: Only editors can manage access codes" }, { status: 403 });
  }

  await connectDB();

  const { formattedCode } = generateAccessCode();
  const accessCodeHash = await bcrypt.hash(formattedCode, 12);

  const project = await Project.findByIdAndUpdate(
    id,
    { accessCodeHash, accessCodeUpdatedAt: new Date() },
    { new: true }
  );

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    code: formattedCode,
    accessCode: formattedCode,
  });
}

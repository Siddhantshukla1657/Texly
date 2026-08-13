import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAuthContext } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Project, ProjectAccess } from "@/lib/models";

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.isAdmin) return NextResponse.json({ error: "Admins don't need access codes" }, { status: 400 });

  const { code } = await request.json();
  if (!code || typeof code !== "string" || code.trim().length === 0) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  await connectDB();

  // Find matching project by comparing hashed codes
  const projects = await Project.find({});
  let matchedProject = null;

  for (const project of projects) {
    const match = await bcrypt.compare(code.trim(), project.accessCodeHash);
    if (match) {
      matchedProject = project;
      break;
    }
  }

  if (!matchedProject) {
    return NextResponse.json({ error: "Invalid access code" }, { status: 400 });
  }

  // Check for existing access
  const existing = await ProjectAccess.findOne({
    projectId: matchedProject._id,
    userId: ctx.user._id,
  });

  if (existing && existing.status === "active") {
    return NextResponse.json({ ok: true, projectId: matchedProject._id });
  }

  if (existing) {
    existing.status = "active";
    existing.revokedAt = undefined;
    existing.grantedAt = new Date();
    await existing.save();
  } else {
    await ProjectAccess.create({
      projectId: matchedProject._id,
      userId: ctx.user._id,
      role: "editor",
      status: "active",
      grantedVia: "code",
    });
  }

  return NextResponse.json({ ok: true, projectId: matchedProject._id, projectName: matchedProject.name });
}

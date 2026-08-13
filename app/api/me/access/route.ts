import { NextResponse } from "next/server";
import { getAuthContext, getActiveProjectIds } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ProjectAccess, Project } from "@/lib/models";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const grants = await ProjectAccess.find({
    userId: ctx.user._id,
    status: "active",
  }).populate("projectId", "name updatedAt");

  return NextResponse.json({ grants, isAdmin: ctx.isAdmin });
}

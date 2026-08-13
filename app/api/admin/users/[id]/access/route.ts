import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ProjectAccess, Project } from "@/lib/models";
import { Types } from "mongoose";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx || !ctx.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const grants = await ProjectAccess.find({ userId: new Types.ObjectId(id) })
    .populate("projectId", "name updatedAt")
    .sort({ grantedAt: -1 });

  return NextResponse.json({ grants });
}

import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ProjectAccess } from "@/lib/models";
import { Types } from "mongoose";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx || !ctx.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const { userId, role = "editor" } = await request.json();

  const existing = await ProjectAccess.findOne({
    projectId: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
  });

  if (existing) {
    existing.status = "active";
    existing.role = role;
    existing.revokedAt = undefined;
    existing.grantedAt = new Date();
    existing.grantedVia = "admin-manual";
    await existing.save();
    return NextResponse.json({ grant: existing });
  }

  const grant = await ProjectAccess.create({
    projectId: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
    role,
    status: "active",
    grantedVia: "admin-manual",
  });

  return NextResponse.json({ grant }, { status: 201 });
}

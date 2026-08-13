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
  const { userId } = await request.json();

  const grant = await ProjectAccess.findOne({
    projectId: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
    status: "active",
  });

  if (!grant) return NextResponse.json({ error: "No active grant found" }, { status: 404 });

  grant.status = "revoked";
  grant.revokedAt = new Date();
  await grant.save();

  return NextResponse.json({ ok: true });
}

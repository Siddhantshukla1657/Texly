import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { getAuthContext } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Project } from "@/lib/models";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx || !ctx.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const rawCode = nanoid(12);
  const accessCodeHash = await bcrypt.hash(rawCode, 12);

  const project = await Project.findByIdAndUpdate(
    id,
    { accessCodeHash, accessCodeUpdatedAt: new Date() },
    { new: true }
  );

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Return the plaintext code once — it won't be stored
  return NextResponse.json({ accessCode: rawCode });
}

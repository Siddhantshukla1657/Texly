import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx || !ctx.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Prevent admin from demoting themselves
  if (id === ctx.user._id.toString()) {
    return NextResponse.json({ error: "Cannot change your own admin status" }, { status: 400 });
  }

  await connectDB();
  const { isAdmin } = await request.json();

  const user = await User.findByIdAndUpdate(id, { isAdmin: !!isAdmin }, { new: true });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ user });
}

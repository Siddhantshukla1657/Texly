import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const users = await User.find({}).sort({ createdAt: -1 });
  return NextResponse.json({ users });
}

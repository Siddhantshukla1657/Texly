import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";

export async function POST(request: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "No webhook secret" }, { status: 500 });
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await request.text();
  const wh = new Webhook(webhookSecret);

  let event: { type: string; data: { id: string; username?: string; email_addresses?: { email_address: string }[] } };
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  await connectDB();

  if (event.type === "user.created" || event.type === "user.updated") {
    const { id: clerkId, username, email_addresses } = event.data;
    const email = email_addresses?.[0]?.email_address ?? "";
    const name = username ?? email.split("@")[0];

    await User.findOneAndUpdate(
      { clerkId },
      { clerkId, username: name, email },
      { upsert: true, new: true }
    );
  }

  return NextResponse.json({ ok: true });
}

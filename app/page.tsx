import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import { User, ProjectAccess } from "@/lib/models";

export default async function RootPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  // Get full Clerk user object to access email
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? "";
  const username =
    clerkUser?.username ??
    clerkUser?.firstName ??
    email.split("@")[0] ??
    clerkId;

  await connectDB();

  // Find by clerkId first, then fall back to matching email for an existing user record.
  let user = await User.findOne({ clerkId });

  if (!user && email) {
    user = await User.findOne({ email });
    if (user) {
      user.clerkId = clerkId;
      user.username = username;
      await user.save();
    }
  }

  if (!user) {
    const hasAdmin = await User.exists({ isAdmin: true });
    const configuredAdmin = process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
    user = await User.create({
      clerkId,
      username,
      email,
      isAdmin: !hasAdmin || !!configuredAdmin,
    });
  } else if (email && process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase() && !user.isAdmin) {
    user.isAdmin = true;
    await user.save();
  }

  // Redirect all authenticated users to /dashboard
  // Admins see the Admin Panel link in the sidebar from there

  const activeAccess = await ProjectAccess.findOne({
    userId: user._id,
    status: "active",
  });

  redirect(activeAccess ? "/dashboard" : "/access-code");
}

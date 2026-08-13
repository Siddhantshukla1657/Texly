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

  const DEFAULT_ADMIN_EMAIL = "siddhantshukla2022@gmail.com";
  const isDefaultAdmin = email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();

  // Find by clerkId first, then fall back to matching email (for pre-seeded admin)
  let user = await User.findOne({ clerkId });

  if (!user && email) {
    // Check if there's a pre-seeded user with this email (e.g. admin seeded via CLI)
    user = await User.findOne({ email });
    if (user) {
      // Bind the Clerk ID to the pre-seeded record
      user.clerkId = clerkId;
      user.username = username;
      if (isDefaultAdmin) {
        user.isAdmin = true;
      }
      await user.save();
    }
  }

  if (!user) {
    // Brand new user
    user = await User.create({
      clerkId,
      username,
      email,
      isAdmin: isDefaultAdmin,
    });
  } else if (isDefaultAdmin && !user.isAdmin) {
    // Auto-promote default admin if logged in user has default admin email
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

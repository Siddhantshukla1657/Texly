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

  // Find by clerkId first, then fall back to matching email (for pre-seeded admin)
  let user = await User.findOne({ clerkId });

  if (!user && email) {
    // Check if there's a pre-seeded user with this email (e.g. admin seeded via CLI)
    user = await User.findOne({ email });
    if (user) {
      // Bind the Clerk ID to the pre-seeded record
      user.clerkId = clerkId;
      user.username = username;
      await user.save();
    }
  }

  if (!user) {
    // Brand new user
    user = await User.create({
      clerkId,
      username,
      email,
      isAdmin: false,
    });
  }

  // Redirect based on role
  if (user.isAdmin) {
    redirect("/admin");
  }

  const activeAccess = await ProjectAccess.findOne({
    userId: user._id,
    status: "active",
  });

  redirect(activeAccess ? "/dashboard" : "/access-code");
}

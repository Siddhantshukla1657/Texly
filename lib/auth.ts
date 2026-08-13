import { auth } from "@clerk/nextjs/server";
import { connectDB } from "./db";
import { User, ProjectAccess, IUser } from "./models";
import { Types } from "mongoose";

export interface AuthContext {
  clerkId: string;
  user: IUser;
  isAdmin: boolean;
}

/** Resolve the current session to a MongoDB User document. Creates one on first sign-in. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  await connectDB();

  let user = await User.findOne({ clerkId });
  if (!user) {
    // If no admin exists in the system yet, auto-promote the first user
    const hasAdmin = await User.exists({ isAdmin: true });
    user = await User.create({
      clerkId,
      username: clerkId, // Will be overwritten by page.tsx with real name
      email: "",
      isAdmin: !hasAdmin,
    });
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  return {
    clerkId,
    user,
    isAdmin: user.isAdmin,
  };
}

/** Check if the authenticated user has active access to a project. */
export async function checkProjectAccess(
  projectId: string,
  requiredRole?: "editor"
): Promise<{ access: boolean; role?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { access: false };
  if (ctx.isAdmin) return { access: true, role: "editor" };

  const grant = await ProjectAccess.findOne({
    projectId: new Types.ObjectId(projectId),
    userId: ctx.user._id,
    status: "active",
  });

  if (!grant) return { access: false };
  if (requiredRole === "editor" && grant.role !== "editor") return { access: false };

  return { access: true, role: grant.role };
}

/** Returns list of active project IDs for a user */
export async function getActiveProjectIds(userId: Types.ObjectId): Promise<Types.ObjectId[]> {
  const grants = await ProjectAccess.find({ userId, status: "active" }).select("projectId");
  return grants.map((g) => g.projectId);
}

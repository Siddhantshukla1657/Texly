import mongoose, { Schema, model, models, Document, Types } from "mongoose";

// ─── User ────────────────────────────────────────────────────────────────────
export interface IUser extends Document {
  clerkId: string;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: Date;
  lastLoginAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true },
    email: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const User = models.User || model<IUser>("User", UserSchema);

// ─── Project ─────────────────────────────────────────────────────────────────
export interface IProject extends Document {
  name: string;
  createdBy: Types.ObjectId;
  accessCodeHash: string;
  accessCodeUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    accessCodeHash: { type: String, required: true },
    accessCodeUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Project = models.Project || model<IProject>("Project", ProjectSchema);

// ─── File ─────────────────────────────────────────────────────────────────────
export interface IFile extends Document {
  projectId: Types.ObjectId;
  filename: string;
  content: string;
  isMainTex: boolean;
  updatedAt: Date;
}

const FileSchema = new Schema<IFile>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    filename: { type: String, required: true },
    content: { type: String, default: "" },
    isMainTex: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const File = models.File || model<IFile>("File", FileSchema);

// ─── Asset ────────────────────────────────────────────────────────────────────
export interface IAsset extends Document {
  projectId: Types.ObjectId;
  filename: string;
  blobUrl: string;
  sizeBytes: number;
  createdAt: Date;
}

const AssetSchema = new Schema<IAsset>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    filename: { type: String, required: true },
    blobUrl: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
  },
  { timestamps: true }
);

export const Asset = models.Asset || model<IAsset>("Asset", AssetSchema);

// ─── Commit ───────────────────────────────────────────────────────────────────
export interface ICommitFile {
  fileId: Types.ObjectId;
  filename: string;
  content: string;
}

export interface ICommit extends Document {
  projectId: Types.ObjectId;
  authorId: Types.ObjectId;
  message: string;
  files: ICommitFile[];
  createdAt: Date;
}

const CommitSchema = new Schema<ICommit>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    files: [
      {
        fileId: Schema.Types.ObjectId,
        filename: String,
        content: String,
      },
    ],
  },
  { timestamps: true }
);

export const Commit = models.Commit || model<ICommit>("Commit", CommitSchema);

// ─── ProjectAccess ────────────────────────────────────────────────────────────
export interface IProjectAccess extends Document {
  projectId: Types.ObjectId;
  userId: Types.ObjectId;
  role: "editor" | "viewer";
  status: "active" | "revoked";
  grantedVia: "code" | "admin-manual";
  grantedAt: Date;
  revokedAt?: Date;
}

const ProjectAccessSchema = new Schema<IProjectAccess>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["editor", "viewer"], default: "editor" },
    status: { type: String, enum: ["active", "revoked"], default: "active" },
    grantedVia: { type: String, enum: ["code", "admin-manual"], required: true },
    grantedAt: { type: Date, default: Date.now },
    revokedAt: { type: Date },
  }
);

ProjectAccessSchema.index({ projectId: 1, userId: 1 }, { unique: true });

export const ProjectAccess =
  models.ProjectAccess || model<IProjectAccess>("ProjectAccess", ProjectAccessSchema);

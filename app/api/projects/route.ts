import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAuthContext } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Project, File, ProjectAccess } from "@/lib/models";
import { generateAccessCode } from "@/lib/accessCode";

const DEFAULT_MAIN_TEX = `\\documentclass[12pt]{article}

% Packages
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath, amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\geometry{margin=1in}

\\title{My Paper}
\\author{Author Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
  This is the abstract of the paper.
\\end{abstract}

\\section{Introduction}
Write your introduction here.

\\section{Methodology}
Describe your methods.

\\section{Results}
Present your results.

\\section{Conclusion}
Conclude the paper.

\\end{document}
`;

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  let projects;
  if (ctx.isAdmin) {
    projects = await Project.find({}).sort({ updatedAt: -1 });
  } else {
    const grants = await ProjectAccess.find({ userId: ctx.user._id, status: "active" }).select("projectId");
    const ids = grants.map((g) => g.projectId);
    projects = await Project.find({ _id: { $in: ids } }).sort({ updatedAt: -1 });
  }

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();

  const { name } = await request.json();
  const projectName = (name || "Untitled Project").trim();

  // Generate access code
  const { formattedCode } = generateAccessCode();
  const accessCodeHash = await bcrypt.hash(formattedCode, 12);

  const project = await Project.create({
    name: projectName,
    createdBy: ctx.user._id,
    accessCodeHash,
    accessCodeUpdatedAt: new Date(),
  });

  // Create default main.tex
  await File.create({
    projectId: project._id,
    filename: "main.tex",
    content: DEFAULT_MAIN_TEX,
    isMainTex: true,
  });

  // Give admin access
  await ProjectAccess.create({
    projectId: project._id,
    userId: ctx.user._id,
    role: "editor",
    status: "active",
    grantedVia: "admin-manual",
  });

  return NextResponse.json({ project, accessCode: formattedCode, code: formattedCode }, { status: 201 });
}

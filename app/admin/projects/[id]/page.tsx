"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import toast from "react-hot-toast";

interface Project {
  _id: string;
  name: string;
  accessCodeUpdatedAt: string;
}

interface Grant {
  _id: string;
  userId: { _id: string; username: string; email: string };
  role: string;
  status: string;
  grantedVia: string;
}

export default function AdminProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${id}`).then((r) => r.json()),
    ]).then(([projectData]) => {
      setProject(projectData.project);
      setNewName(projectData.project?.name || "");
      setLoading(false);
    });
  }, [id]);

  async function regenerateCode() {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/admin/projects/${id}/code/regenerate`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setAccessCode(data.accessCode);
        toast.success("Access code regenerated");
      }
    } finally {
      setRegenerating(false);
    }
  }

  async function renameProject() {
    if (!newName.trim()) return;
    setRenaming(true);
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    const data = await res.json();
    if (res.ok) {
      setProject(data.project);
      toast.success("Project renamed");
    }
    setRenaming(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "100vh" }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-chrome)" }}>
      <div className="navbar">
        <Link href="/admin" className="btn btn-ghost btn-sm">
          ← Admin
        </Link>
        <div style={{ flex: 1 }} />
        <UserButton />
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 24px" }}>
        <div className="flex items-center gap-3" style={{ marginBottom: "32px" }}>
          <h1 style={{ flex: 1 }}>{project?.name}</h1>
          <Link href={`/projects/${id}`} className="btn btn-secondary btn-sm">
            Open Editor →
          </Link>
        </div>

        {/* Rename */}
        <div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
          <h3 style={{ marginBottom: "16px" }}>Rename Project</h3>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button className="btn btn-secondary" onClick={renameProject} disabled={renaming}>
              {renaming ? "Saving…" : "Rename"}
            </button>
          </div>
        </div>

        {/* Access Code */}
        <div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
          <h3 style={{ marginBottom: "8px" }}>Access Code</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "16px" }}>
            Codes are hashed at rest. Regenerate to invalidate the current code for new redemptions
            — existing user access is unaffected.
          </p>

          {accessCode ? (
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", color: "var(--warning)", marginBottom: "8px" }}>
                ⚠ Save this code now — it won&apos;t be shown again.
              </p>
              <div className="code-reveal">{accessCode}</div>
              <button
                className="btn btn-secondary btn-sm"
                style={{ marginTop: "8px" }}
                onClick={() => {
                  navigator.clipboard.writeText(accessCode);
                  toast.success("Copied!");
                }}
              >
                Copy
              </button>
            </div>
          ) : (
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
              Last updated:{" "}
              {project?.accessCodeUpdatedAt
                ? new Date(project.accessCodeUpdatedAt).toLocaleDateString()
                : "unknown"}
            </p>
          )}

          <button
            className="btn btn-admin"
            onClick={regenerateCode}
            disabled={regenerating}
          >
            {regenerating ? "Regenerating…" : "Regenerate Code"}
          </button>
        </div>
      </div>
    </div>
  );
}

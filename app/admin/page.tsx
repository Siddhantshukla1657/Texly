"use client";
import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import toast from "react-hot-toast";

interface Project {
  _id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
}

interface User {
  _id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<"projects" | "users">("projects");
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data.projects || []);
    } finally {
      setLoading(false);
    }
  }

  async function createProject(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName || "Untitled Project" }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedCode(data.accessCode);
        fetchProjects();
        setNewProjectName("");
      } else {
        toast.error(data.error);
      }
    } finally {
      setCreating(false);
    }
  }

  async function deleteProject(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Project deleted");
      fetchProjects();
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-chrome)" }}>
      {/* Navbar */}
      <div className="navbar">
        <div className="navbar-logo">
          Tex<span style={{ color: "var(--primary)" }}>ly</span>
          <span
            className="badge badge-admin"
            style={{ marginLeft: "8px", fontSize: "10px" }}
          >
            Admin
          </span>
        </div>
        <div className="flex items-center gap-3" style={{ marginLeft: "auto" }}>
          <UserButton />
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-chrome)",
          display: "flex",
          padding: "0 24px",
        }}
      >
        {["projects", "users"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "projects" | "users")}
            style={{
              padding: "12px 20px",
              border: "none",
              background: "none",
              color: activeTab === tab ? "var(--admin-accent)" : "var(--text-muted)",
              fontFamily: "var(--font-ui)",
              fontSize: "14px",
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: "pointer",
              borderBottom: activeTab === tab ? "2px solid var(--admin-accent)" : "2px solid transparent",
              transition: "all var(--transition)",
              textTransform: "capitalize",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px" }}>
        {activeTab === "projects" && (
          <>
            <div className="flex items-center justify-between" style={{ marginBottom: "32px" }}>
              <div>
                <h1>Projects</h1>
                <p style={{ color: "var(--text-muted)", marginTop: "4px", fontSize: "14px" }}>
                  {projects.length} project{projects.length !== 1 ? "s" : ""} total
                </p>
              </div>
              <button
                className="btn btn-admin"
                onClick={() => setShowNewProject(true)}
              >
                + New Project
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center" style={{ padding: "64px" }}>
                <div className="spinner" />
              </div>
            ) : projects.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📂</div>
                <div className="empty-state-text">No projects yet</div>
                <button className="btn btn-admin" onClick={() => setShowNewProject(true)}>
                  Create first project
                </button>
              </div>
            ) : (
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                {projects.map((project, i) => (
                  <div
                    key={project._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "16px 20px",
                      borderBottom: i < projects.length - 1 ? "1px solid var(--border)" : "none",
                      gap: "12px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "14px",
                          color: "var(--text-primary)",
                          marginBottom: "2px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {project.name}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        Updated {new Date(project.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/admin/projects/${project._id}`} className="btn btn-secondary btn-sm">
                        Manage
                      </Link>
                      <Link href={`/projects/${project._id}`} className="btn btn-secondary btn-sm">
                        Open
                      </Link>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteProject(project._id, project.name)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "users" && <AdminUsersTab />}
      </div>

      {/* New Project Modal */}
      {showNewProject && (
        <div className="modal-overlay" onClick={() => { setShowNewProject(false); setCreatedCode(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {createdCode ? (
              <>
                <div className="modal-title">Project Created ✓</div>
                <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "16px" }}>
                  Save this access code — it&apos;s only shown once.
                </p>
                <div className="code-reveal" style={{ marginBottom: "20px" }}>
                  {createdCode}
                </div>
                <button
                  className="btn btn-primary w-full"
                  style={{ justifyContent: "center" }}
                  onClick={() => {
                    navigator.clipboard.writeText(createdCode);
                    toast.success("Code copied!");
                  }}
                >
                  Copy Code
                </button>
                <button
                  className="btn btn-ghost w-full"
                  style={{ justifyContent: "center", marginTop: "8px" }}
                  onClick={() => { setShowNewProject(false); setCreatedCode(null); }}
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <div className="modal-title">New Project</div>
                <form onSubmit={createProject}>
                  <div style={{ marginBottom: "16px" }}>
                    <label className="label">Project Name</label>
                    <input
                      className="input"
                      placeholder="Untitled Project"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary flex-1"
                      onClick={() => setShowNewProject(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-admin flex-1" disabled={creating}>
                      {creating ? "Creating…" : "Create"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin Users Tab ──────────────────────────────────────────────────────────
function AdminUsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center" style={{ padding: "64px" }}><div className="spinner" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: "32px" }}>
        <div>
          <h1>Users</h1>
          <p style={{ color: "var(--text-muted)", marginTop: "4px", fontSize: "14px" }}>
            {users.length} registered user{users.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selectedUser ? "1fr 1fr" : "1fr", gap: "24px" }}>
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          {users.map((user, i) => (
            <div
              key={user._id}
              onClick={() => setSelectedUser(user)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 20px",
                borderBottom: i < users.length - 1 ? "1px solid var(--border)" : "none",
                cursor: "pointer",
                background: selectedUser?._id === user._id ? "var(--bg-active)" : "transparent",
                transition: "background var(--transition)",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: user.isAdmin ? "var(--admin-accent-muted)" : "var(--primary-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: user.isAdmin ? "var(--admin-accent)" : "var(--primary)",
                  flexShrink: 0,
                }}
              >
                {user.username[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.username}
                  {user.isAdmin && (
                    <span className="badge badge-admin" style={{ marginLeft: "8px" }}>
                      admin
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{user.email}</div>
              </div>
              <span style={{ color: "var(--text-muted)", fontSize: "18px" }}>›</span>
            </div>
          ))}
        </div>

        {selectedUser && (
          <AdminUserDetail
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onUpdate={(updatedUser) => {
              setUsers((prev) => prev.map((u) => (u._id === updatedUser._id ? updatedUser : u)));
              setSelectedUser(updatedUser);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Admin User Detail ────────────────────────────────────────────────────────
interface Grant {
  _id: string;
  projectId: { _id: string; name: string };
  role: string;
  status: string;
  grantedVia: string;
  grantedAt: string;
  revokedAt?: string;
}

function AdminUserDetail({
  user,
  onClose,
  onUpdate,
}: {
  user: User;
  onClose: () => void;
  onUpdate: (u: User) => void;
}) {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/users/${user._id}/access`)
      .then((r) => r.json())
      .then((d) => setGrants(d.grants || []))
      .finally(() => setLoading(false));
  }, [user._id]);

  async function toggleAdmin() {
    const res = await fetch(`/api/admin/users/${user._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAdmin: !user.isAdmin }),
    });
    const data = await res.json();
    if (res.ok) {
      onUpdate(data.user);
      toast.success("Role updated");
    } else {
      toast.error(data.error);
    }
  }

  async function revokeAccess(projectId: string) {
    const res = await fetch(`/api/admin/projects/${projectId}/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user._id }),
    });
    if (res.ok) {
      toast.success("Access revoked");
      setGrants((prev) =>
        prev.map((g) =>
          g.projectId._id === projectId ? { ...g, status: "revoked" } : g
        )
      );
    }
  }

  async function grantAccess(projectId: string) {
    const res = await fetch(`/api/admin/projects/${projectId}/grant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user._id }),
    });
    if (res.ok) {
      toast.success("Access granted");
      setGrants((prev) =>
        prev.map((g) =>
          g.projectId._id === projectId ? { ...g, status: "active" } : g
        )
      );
    }
  }

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: "15px" }}>{user.username}</div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{user.email}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>

      {/* Actions */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          gap: "8px",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "12px", color: "var(--text-muted)", flex: 1 }}>
          Role: {user.isAdmin ? "Admin" : "User"}
        </span>
        <button
          className={`btn btn-sm ${user.isAdmin ? "btn-danger" : "btn-admin"}`}
          onClick={toggleAdmin}
        >
          {user.isAdmin ? "Remove Admin" : "Make Admin"}
        </button>
      </div>

      {/* Project Access */}
      <div style={{ padding: "12px 20px", flex: 1, overflowY: "auto" }}>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: "12px",
          }}
        >
          Project Access
        </div>
        {loading ? (
          <div className="flex items-center justify-center" style={{ padding: "32px" }}>
            <div className="spinner" />
          </div>
        ) : grants.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>No project access</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {grants.map((grant) => (
              <div
                key={grant._id}
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {grant.projectId.name}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {grant.role} · via {grant.grantedVia}
                  </div>
                </div>
                <span
                  className={`badge ${grant.status === "active" ? "badge-success" : "badge-error"}`}
                >
                  {grant.status}
                </span>
                {grant.status === "active" ? (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => revokeAccess(grant.projectId._id)}
                  >
                    Revoke
                  </button>
                ) : (
                  <button
                    className="btn btn-admin btn-sm"
                    onClick={() => grantAccess(grant.projectId._id)}
                  >
                    Grant
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";

/* ─── Types ───────────────────────────────────────────────────── */
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

/* ─── Inline SVG icons ────────────────────────────────────────── */
function DocIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
function UsersIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function ShieldIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function HomeIcon({ size = 15, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function KeyIcon({ size = 15, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="15" r="4" />
      <line x1="10.85" x2="22" y1="12.15" y2="1" />
      <line x1="18" x2="21" y1="4" y2="7" />
    </svg>
  );
}
function TrashIcon({ size = 13, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}
function XIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function CopyIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/* ─── Sidebar ─────────────────────────────────────────────────── */
function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/logo.png" alt="Texly" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
        <div>
          <div className="sidebar-brand-name">Texly</div>
          <div className="sidebar-brand-tag">Admin Console</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        <Link href="/dashboard" className="sidebar-link">
          <HomeIcon size={15} />
          Dashboard
        </Link>

        <div className="sidebar-section-label" style={{ marginTop: "8px" }}>
          Administration
        </div>
        <Link
          href="/admin"
          className={`sidebar-link admin-link${pathname === "/admin" ? " active" : ""}`}
        >
          <ShieldIcon size={15} />
          Admin Panel
        </Link>
      </nav>

      <div className="sidebar-footer">
        <UserButton />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="sidebar-user-name">
            {user?.firstName
              ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
              : user?.username || "Admin"}
          </div>
          <div className="sidebar-user-email">
            {user?.emailAddresses?.[0]?.emailAddress ?? ""}
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ─── Admin Page ──────────────────────────────────────────────── */
export default function AdminPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<"projects" | "users">("projects");
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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
        body: JSON.stringify({ name: newProjectName || "Untitled Document" }),
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
    <div className="app-shell">
      <Sidebar />

      <div className="main-content">
        {/* ── Header ── */}
        <div className="page-header">
          <div className="page-header-inner">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="page-title">Admin Panel</div>
                <span className="badge badge-indigo" style={{ fontSize: "11px" }}>
                  <ShieldIcon size={10} color="#4F46E5" /> System Access
                </span>
              </div>
              <div className="page-subtitle">Manage projects, users, and access permissions</div>
            </div>

            {activeTab === "projects" && (
              <button className="btn btn-primary" onClick={() => setShowNewProject(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Project
              </button>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
            {(["projects", "users"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`page-tab${activeTab === tab ? " active" : ""}`}
              >
                {tab === "projects" ? <DocIcon size={13} /> : <UsersIcon size={13} />}
                {tab === "projects" ? "Projects" : "Users"}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="page-body">
          {activeTab === "projects" && (
            <>
              {/* Stats row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: "14px",
                  marginBottom: "24px",
                }}
              >
                <div className="stat-card">
                  <div className="stat-icon stat-icon-blue">
                    <DocIcon size={20} color="#2563EB" />
                  </div>
                  <div>
                    <div className="stat-val">{projects.length}</div>
                    <div className="stat-label">Total Projects</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon stat-icon-green">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div>
                    <div className="stat-val">{projects.length}</div>
                    <div className="stat-label">Active Projects</div>
                  </div>
                </div>
              </div>

              {/* Projects table */}
              {loading ? (
                <div className="flex items-center justify-center" style={{ padding: "64px" }}>
                  <div className="spinner" />
                </div>
              ) : projects.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <DocIcon size={28} color="#2563EB" />
                  </div>
                  <div className="empty-state-title">No projects yet</div>
                  <p className="empty-state-sub">Create your first project to generate an access code for users.</p>
                  <button className="btn btn-primary" onClick={() => setShowNewProject(true)}>
                    Create First Project
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-lg)",
                    overflow: "hidden",
                    boxShadow: "var(--shadow-xs)",
                  }}
                >
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>Created</th>
                        <th>Last Updated</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((project) => (
                        <tr key={project._id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "var(--r-sm)",
                                  background: "var(--blue-50)",
                                  border: "1px solid rgba(37,99,235,0.10)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <DocIcon size={14} color="#2563EB" />
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "13px" }}>
                                  {project.name}
                                </div>
                                <div style={{ fontSize: "11px", color: "var(--text-4)", fontFamily: "var(--font-mono)" }}>
                                  {project._id.slice(-8)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ color: "var(--text-3)", fontSize: "12px" }}>
                            {new Date(project.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td style={{ color: "var(--text-3)", fontSize: "12px" }}>
                            {new Date(project.updatedAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                              <Link
                                href={`/projects/${project._id}`}
                                className="btn btn-secondary btn-sm"
                              >
                                Open Editor
                              </Link>
                              <button
                                className="btn btn-sm"
                                style={{
                                  background: "var(--red-50)",
                                  color: "var(--red-600)",
                                  border: "1px solid rgba(220,38,38,0.18)",
                                }}
                                onClick={() => deleteProject(project._id, project.name)}
                              >
                                <TrashIcon size={12} color="#DC2626" /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === "users" && <AdminUsersTab />}
        </div>
      </div>

      {/* ── New Project Modal ── */}
      {showNewProject && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowNewProject(false);
            setCreatedCode(null);
          }}
        >
          <div className="modal-parchment" onClick={(e) => e.stopPropagation()}>
            {createdCode ? (
              <div>
                {/* Success state */}
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "var(--r-lg)",
                      background: "var(--green-50)",
                      border: "1px solid rgba(22,163,74,0.20)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 14px",
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
                    Project Created!
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-3)" }}>
                    Share this access code with your team members
                  </p>
                </div>

                <div className="code-reveal" style={{ marginBottom: "16px" }}>
                  {createdCode}
                </div>

                <div className="flex gap-2">
                  <button
                    className="btn btn-secondary flex-1"
                    onClick={() => {
                      navigator.clipboard.writeText(createdCode);
                      toast.success("Access code copied!");
                    }}
                  >
                    <CopyIcon size={13} /> Copy Code
                  </button>
                  <button
                    className="btn btn-primary flex-1"
                    onClick={() => {
                      setShowNewProject(false);
                      setCreatedCode(null);
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={createProject}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                  <div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)" }}>
                      New Project
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>
                      An access code will be generated automatically
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => setShowNewProject(false)}
                  >
                    <XIcon size={16} color="#64748B" />
                  </button>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      display: "block",
                      marginBottom: "7px",
                      color: "var(--text-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                    }}
                  >
                    Project Name
                  </label>
                  <input
                    className="input-parchment"
                    placeholder="e.g. Research Paper 2025"
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
                  <button type="submit" className="btn btn-primary flex-1" disabled={creating}>
                    {creating ? "Creating…" : "Create Project"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Users Tab ───────────────────────────────────────────────── */
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

  if (loading) {
    return (
      <div className="flex justify-center" style={{ padding: "64px" }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        <div className="stat-card">
          <div className="stat-icon stat-icon-indigo">
            <UsersIcon size={20} color="#4F46E5" />
          </div>
          <div>
            <div className="stat-val">{users.length}</div>
            <div className="stat-label">Registered Users</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-amber">
            <ShieldIcon size={20} color="#D97706" />
          </div>
          <div>
            <div className="stat-val">{users.filter((u) => u.isAdmin).length}</div>
            <div className="stat-label">Administrators</div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: selectedUser ? "1fr 380px" : "1fr",
          gap: "16px",
          alignItems: "start",
        }}
      >
        {/* Users table */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            overflow: "hidden",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user._id}
                  onClick={() => setSelectedUser(user._id === selectedUser?._id ? null : user)}
                  style={{
                    cursor: "pointer",
                    background:
                      selectedUser?._id === user._id ? "var(--blue-50)" : "transparent",
                  }}
                >
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: user.isAdmin
                            ? "linear-gradient(135deg, #2563EB, #4F46E5)"
                            : "var(--surface-3)",
                          color: user.isAdmin ? "#fff" : "var(--text-3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "13px",
                          flexShrink: 0,
                        }}
                      >
                        {user.username[0]?.toUpperCase() || "U"}
                      </div>
                      <span style={{ fontWeight: 500, color: "var(--text)", fontSize: "13px" }}>
                        {user.username}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--text-3)" }}>{user.email}</td>
                  <td>
                    {user.isAdmin ? (
                      <span className="badge badge-indigo">
                        <ShieldIcon size={10} color="#4F46E5" /> Admin
                      </span>
                    ) : (
                      <span className="badge badge-ink">User</span>
                    )}
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--text-3)" }}>
                    {new Date(user.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selectedUser && (
          <AdminUserDetail
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onUpdate={(u) => {
              setUsers((prev) => prev.map((x) => (x._id === u._id ? u : x)));
              setSelectedUser(u);
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ─── User Detail Panel ───────────────────────────────────────── */
function AdminUserDetail({
  user,
  onClose,
  onUpdate,
}: {
  user: User;
  onClose: () => void;
  onUpdate: (u: User) => void;
}) {
  const [grants, setGrants] = useState<
    { _id: string; projectId: { _id: string; name: string }; role: string; status: string }[]
  >([]);
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
    if (!confirm("Revoke this user's access to the project?")) return;
    const res = await fetch(`/api/admin/projects/${projectId}/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user._id }),
    });
    if (res.ok) {
      toast.success("Access revoked");
      setGrants((prev) =>
        prev.map((g) => (g.projectId._id === projectId ? { ...g, status: "revoked" } : g))
      );
    }
  }

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 18px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--surface-2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: user.isAdmin
                ? "linear-gradient(135deg, #2563EB, #4F46E5)"
                : "var(--surface-3)",
              color: user.isAdmin ? "#fff" : "var(--text-3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "16px",
            }}
          >
            {user.username[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text)" }}>
              {user.username}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-3)" }}>{user.email}</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={onClose}>
          <XIcon size={14} color="#64748B" />
        </button>
      </div>

      {/* Role control */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>
            Current Role
          </div>
          {user.isAdmin ? (
            <span className="badge badge-indigo">
              <ShieldIcon size={10} color="#4F46E5" /> Administrator
            </span>
          ) : (
            <span className="badge badge-ink">Regular User</span>
          )}
        </div>
        <button
          className={`btn btn-sm ${user.isAdmin ? "btn-destructive" : "btn-primary"}`}
          onClick={toggleAdmin}
        >
          {user.isAdmin ? "Revoke Admin" : "Make Admin"}
        </button>
      </div>

      {/* Project access */}
      <div style={{ padding: "14px 18px" }}>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--text-3)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "12px",
          }}
        >
          Project Access
        </div>

        {loading ? (
          <div className="flex justify-center" style={{ padding: "20px" }}>
            <div className="spinner" />
          </div>
        ) : grants.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              color: "var(--text-4)",
              fontSize: "12px",
            }}
          >
            No project access assigned
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {grants.map((grant) => (
              <div
                key={grant._id}
                style={{
                  padding: "10px 12px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)" }}>
                    {grant.projectId.name}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-4)" }}>
                    Role: {grant.role}
                  </div>
                </div>
                {grant.status === "active" ? (
                  <button
                    className="btn btn-sm"
                    style={{
                      background: "var(--red-50)",
                      color: "var(--red-600)",
                      border: "1px solid rgba(220,38,38,0.18)",
                      flexShrink: 0,
                    }}
                    onClick={() => revokeAccess(grant.projectId._id)}
                  >
                    Revoke
                  </button>
                ) : (
                  <span className="badge badge-red">Revoked</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

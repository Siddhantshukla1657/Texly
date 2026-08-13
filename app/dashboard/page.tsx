"use client";
import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";
import {
  IconDocument,
  IconKey,
  IconEdit,
  IconLock,
  IconAdmin,
} from "@/components/icons";

interface Project {
  _id: string;
  name: string;
  updatedAt: string;
}

interface Grant {
  _id: string;
  projectId: Project;
  role: string;
  status: string;
  grantedAt: string;
}

/* ─── Icon helpers ─────────────────────────────────────────────── */
function DocIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
function KeyIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="15" r="4" />
      <line x1="10.85" x2="22" y1="12.15" y2="1" />
      <line x1="18" x2="21" y1="4" y2="7" />
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
function SearchIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

/* ─── Sidebar ─────────────────────────────────────────────────── */
function Sidebar({
  isAdmin,
  onRedeemClick,
}: {
  isAdmin: boolean;
  onRedeemClick: () => void;
}) {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <img src="/logo.png" alt="Texly" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
        <div>
          <div className="sidebar-brand-name">Texly</div>
          <div className="sidebar-brand-tag">LaTeX Editor</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Workspace</div>

        <Link
          href="/dashboard"
          className={`sidebar-link${pathname === "/dashboard" ? " active" : ""}`}
        >
          <DocIcon size={15} />
          My Projects
        </Link>

        <button className="sidebar-link" onClick={onRedeemClick}>
          <KeyIcon size={15} />
          Redeem Code
        </button>

        {isAdmin && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: "8px" }}>
              Administration
            </div>
            <Link href="/admin" className="sidebar-link admin-link">
              <ShieldIcon size={15} />
              Admin Panel
            </Link>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <UserButton />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="sidebar-user-name">
            {user?.firstName
              ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
              : user?.username || "Account"}
          </div>
          <div className="sidebar-user-email">
            {user?.emailAddresses?.[0]?.emailAddress ?? ""}
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ─── Role badge colours ─────────────────────────────────────── */
function RoleBadge({ role }: { role: string }) {
  if (role === "editor") {
    return (
      <span className="badge badge-verdigris" style={{ display: "flex", alignItems: "center", gap: 3 }}>
        <IconEdit size={10} /> editor
      </span>
    );
  }
  return (
    <span className="badge badge-amber" style={{ display: "flex", alignItems: "center", gap: 3 }}>
      <IconLock size={10} /> viewer
    </span>
  );
}

/* ─── Dashboard Page ──────────────────────────────────────────── */
export default function DashboardPage() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [code, setCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);

  useEffect(() => {
    fetchGrants();
  }, []);

  async function fetchGrants() {
    try {
      const res = await fetch("/api/me/access");
      const data = await res.json();
      setGrants(data.grants || []);
      setIsAdmin(data.isAdmin || false);
    } finally {
      setLoading(false);
    }
  }

  async function handleRedeem(e: FormEvent) {
    e.preventDefault();
    setRedeemLoading(true);
    try {
      const res = await fetch("/api/access-code/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Invalid access code");
      } else {
        toast.success(`Access granted to "${data.projectName}"`);
        setShowCodeModal(false);
        setCode("");
        fetchGrants();
      }
    } finally {
      setRedeemLoading(false);
    }
  }

  const filteredGrants = grants.filter((g) =>
    g.projectId?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="app-shell">
      <Sidebar isAdmin={isAdmin} onRedeemClick={() => setShowCodeModal(true)} />

      <div className="main-content">
        {/* ── Page header ── */}
        <div className="page-header">
          <div className="page-header-inner">
            <div>
              <div className="page-title">Projects</div>
              <div className="page-subtitle">
                {loading
                  ? "Loading workspace…"
                  : `${grants.length} project${grants.length !== 1 ? "s" : ""} in your workspace`}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {/* Search */}
              <div className="search-wrapper">
                <span className="search-icon">
                  <SearchIcon size={14} color="#94A3B8" />
                </span>
                <input
                  className="input-parchment"
                  placeholder="Search projects…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "220px" }}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={() => setShowCodeModal(true)}
              >
                <KeyIcon size={14} color="#fff" />
                Add Access Code
              </button>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="page-body">
          {loading ? (
            <div className="flex items-center justify-center" style={{ padding: "80px" }}>
              <div className="spinner" />
            </div>
          ) : filteredGrants.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <DocIcon size={28} color="#2563EB" />
              </div>
              <div className="empty-state-title">
                {searchQuery ? "No matching projects" : "No projects yet"}
              </div>
              <p className="empty-state-sub">
                {searchQuery
                  ? "Try a different search term or clear the filter."
                  : "Paste an access code from your project admin to unlock a shared LaTeX workspace."}
              </p>
              {!searchQuery && (
                <button
                  className="btn btn-primary"
                  onClick={() => setShowCodeModal(true)}
                >
                  <KeyIcon size={14} color="#fff" />
                  Enter Access Code
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
                gap: "16px",
              }}
            >
              {filteredGrants.map((grant) => (
                <Link
                  key={grant._id}
                  href={`/projects/${grant.projectId._id}`}
                  className="proj-card"
                >
                  <div>
                    {/* Icon + role badge */}
                    <div className="flex items-center justify-between" style={{ marginBottom: "10px" }}>
                      <div className="proj-icon-wrap">
                        <DocIcon size={18} color="#2563EB" />
                      </div>
                      <RoleBadge role={grant.role} />
                    </div>

                    {/* Name */}
                    <div className="proj-name">{grant.projectId.name}</div>
                  </div>

                  {/* Footer meta */}
                  <div className="proj-meta">
                    Updated{" "}
                    {new Date(grant.projectId.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Redeem Modal ── */}
      {showCodeModal && (
        <div className="modal-overlay" onClick={() => setShowCodeModal(false)}>
          <div className="modal-parchment" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "var(--r)",
                  background: "var(--blue-50)",
                  border: "1px solid rgba(37,99,235,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <KeyIcon size={18} color="#2563EB" />
              </div>
              <div>
                <div style={{ fontSize: "17px", fontWeight: 700, color: "var(--text)" }}>
                  Redeem Access Code
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>
                  Unlock a shared LaTeX project
                </div>
              </div>
            </div>

            <div
              style={{
                height: "1px",
                background: "var(--border)",
                margin: "16px -28px",
              }}
            />

            <form onSubmit={handleRedeem}>
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
                  Access Code
                </label>
                <input
                  className="input-parchment input-mono"
                  placeholder="CODE-XXXX-XXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  autoFocus
                  style={{ fontSize: "16px", textAlign: "center", letterSpacing: "0.12em" }}
                />
                <p style={{ fontSize: "11px", color: "var(--text-4)", marginTop: "6px", textAlign: "center" }}>
                  Provided by your project administrator
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary flex-1"
                  onClick={() => setShowCodeModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={redeemLoading || !code.trim()}
                >
                  {redeemLoading ? "Verifying…" : "Unlock Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

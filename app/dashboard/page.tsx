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
}

interface Grant {
  _id: string;
  projectId: Project;
  role: string;
  status: string;
  grantedAt: string;
}

export default function DashboardPage() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [code, setCode] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchGrants();
  }, []);

  async function fetchGrants() {
    try {
      const res = await fetch("/api/me/access");
      const data = await res.json();
      setGrants(data.grants || []);
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

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-chrome)" }}>
      {/* Navbar */}
      <div className="navbar">
        <div className="navbar-logo">
          Tex<span>ly</span>
        </div>
        <div className="flex items-center gap-3" style={{ marginLeft: "auto" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowCodeModal(true)}
          >
            + Add access code
          </button>
          <UserButton />
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: "32px" }}>
          <div>
            <h1>My Projects</h1>
            <p style={{ color: "var(--text-muted)", marginTop: "4px", fontSize: "14px" }}>
              {grants.length} project{grants.length !== 1 ? "s" : ""} accessible
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center" style={{ padding: "64px" }}>
            <div className="spinner" />
          </div>
        ) : grants.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <div className="empty-state-text">No projects yet</div>
            <button className="btn btn-primary" onClick={() => setShowCodeModal(true)}>
              Add access code
            </button>
          </div>
        ) : (
          <div className="dashboard-grid">
            {grants.map((grant) => (
              <Link
                key={grant._id}
                href={`/projects/${grant.projectId._id}`}
                className="project-card"
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      background: "var(--primary-muted)",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                    }}
                  >
                    📝
                  </div>
                  <span
                    className={`badge ${grant.role === "editor" ? "badge-primary" : "badge-muted"}`}
                  >
                    {grant.role}
                  </span>
                </div>
                <div className="project-card-name">{grant.projectId.name}</div>
                <div className="project-card-meta">
                  Updated {new Date(grant.projectId.updatedAt).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Add Code Modal */}
      {showCodeModal && (
        <div className="modal-overlay" onClick={() => setShowCodeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Add Access Code</div>
            <form onSubmit={handleRedeem}>
              <div style={{ marginBottom: "16px" }}>
                <label className="label">Access Code</label>
                <input
                  className="input input-mono"
                  placeholder="Enter access code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoFocus
                />
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
                  {redeemLoading ? "Verifying…" : "Unlock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

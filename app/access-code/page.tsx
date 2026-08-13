"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import toast from "react-hot-toast";

export default function AccessCodePage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/access-code/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid access code");
      } else {
        toast.success(`Access granted to "${data.projectName}"`);
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <div style={{ position: "fixed", top: "16px", right: "16px" }}>
        <UserButton />
      </div>

      <div style={{ width: "100%", maxWidth: "400px", padding: "0 16px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-0.5px", marginBottom: "8px" }}>
            Tex<span style={{ color: "var(--primary)" }}>ly</span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
            Enter an access code to unlock a project
          </p>
        </div>

        <div className="card" style={{ padding: "32px" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "20px" }}>
              <label className="label" htmlFor="code-input">
                Access Code
              </label>
              <input
                id="code-input"
                type="text"
                className="input input-mono"
                placeholder="Enter your access code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {error && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "10px 12px",
                  background: "var(--error-muted)",
                  border: "1px solid rgba(243, 139, 168, 0.3)",
                  borderRadius: "8px",
                  color: "var(--error)",
                  fontSize: "13px",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading || !code.trim()}
              style={{ justifyContent: "center" }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: "14px", height: "14px" }} />
                  Verifying…
                </>
              ) : (
                "Unlock Project"
              )}
            </button>
          </form>

          <p
            style={{
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "12px",
              marginTop: "20px",
            }}
          >
            Ask the project owner for an access code
          </p>
        </div>
      </div>
    </div>
  );
}

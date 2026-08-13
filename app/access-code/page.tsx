"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import toast from "react-hot-toast";
import { IconKey } from "@/components/icons";

export default function AccessCodePage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successProject, setSuccessProject] = useState<string | null>(null);
  const router = useRouter();

  function handleCodeChange(val: string) {
    // Strip non-alphanumeric and auto-uppercase
    const raw = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 16);
    // Group in 4s with hyphen
    const formatted = raw.match(/.{1,4}/g)?.join("-") || raw;
    setCode(formatted);
  }

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
        setError(data.error || "Invalid or expired access code");
        setCode("");
      } else {
        setSuccessProject(data.projectName || "Project");
        toast.success(`Access granted!`);
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 1200);
      }
    } catch {
      setError("Something went wrong. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--parchment)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
      }}
    >
      <div style={{ position: "fixed", top: "20px", right: "20px" }}>
        <UserButton />
      </div>

      <div style={{ width: "100%", maxWidth: "420px" }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: "36px", fontWeight: 600, color: "var(--ink)" }}>
            Texly
          </div>
          <p style={{ color: "var(--ink-60)", fontSize: "14px", marginTop: "4px" }}>
            Enter an access code to unlock a document workspace
          </p>
        </div>

        {/* Card */}
        <div className="card-parchment" style={{ padding: "36px" }}>
          {successProject ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "var(--verdigris-tint)",
                  color: "var(--verdigris-text)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  fontSize: "24px",
                }}
              >
                ✓
              </div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "20px", fontWeight: 600, color: "var(--ink)", marginBottom: "6px" }}>
                Access Granted
              </div>
              <p style={{ color: "var(--ink-60)", fontSize: "13px" }}>
                Added <strong>{successProject}</strong> to your dashboard. Redirecting…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: "8px" }}>
                  Access Code
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="code-input"
                    type="text"
                    className="input-parchment input-mono"
                    placeholder="XXXX-XXXX-XXXX"
                    value={code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    style={{ fontSize: "16px", textAlign: "center", letterSpacing: "0.15em", padding: "12px" }}
                  />
                </div>
              </div>

              {error && (
                <div
                  style={{
                    marginBottom: "20px",
                    padding: "10px 14px",
                    background: "var(--red-tint)",
                    border: "1px solid rgba(166, 64, 47, 0.3)",
                    borderRadius: "var(--radius-control)",
                    color: "var(--marginalia-red)",
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
                style={{ padding: "12px", fontSize: "14px" }}
              >
                {loading ? (
                  <>
                    <div className="spinner spinner-ink" style={{ width: "14px", height: "14px" }} />
                    Verifying Code…
                  </>
                ) : (
                  <>
                    <IconKey size={18} />
                    Unlock Workspace
                  </>
                )}
              </button>
            </form>
          )}

          <p
            style={{
              textAlign: "center",
              color: "var(--ink-35)",
              fontSize: "12px",
              marginTop: "24px",
            }}
          >
            Access codes are generated by project owners in the Share panel.
          </p>
        </div>
      </div>
    </div>
  );
}

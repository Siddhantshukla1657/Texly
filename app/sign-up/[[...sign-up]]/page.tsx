import { SignUp } from "@clerk/nextjs";

const clerkDark = {
  elements: {
    rootBox: { width: "400px" },
    card: {
      background: "#1e293b",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "16px",
      boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
    },
    headerTitle: { color: "#f8fafc", fontSize: "20px", fontWeight: "700" },
    headerSubtitle: { color: "#64748b" },
    formFieldLabel: { color: "#94a3b8", fontSize: "13px" },
    formFieldInput: {
      background: "rgba(15,23,42,0.7)",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "#f8fafc",
      borderRadius: "10px",
      fontSize: "14px",
    },
    formButtonPrimary: {
      background: "linear-gradient(135deg, #6366f1, #4f46e5)",
      borderRadius: "10px",
      boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
      fontSize: "14px",
      fontWeight: "600",
    },
    footerActionLink: { color: "#818cf8" },
    dividerLine: { background: "rgba(255,255,255,0.08)" },
    dividerText: { color: "#64748b" },
    identityPreviewText: { color: "#94a3b8" },
    socialButtonsBlockButton: {
      background: "rgba(30,41,59,0.7)",
      border: "1px solid rgba(255,255,255,0.1)",
      color: "#f8fafc",
      borderRadius: "10px",
    },
    socialButtonsBlockButtonText: { color: "#f8fafc" },
    alternativeMethodsBlockButton: {
      background: "rgba(30,41,59,0.7)",
      border: "1px solid rgba(255,255,255,0.1)",
      color: "#f8fafc",
      borderRadius: "10px",
    },
    formFieldInputShowPasswordButton: { color: "#64748b" },
    footer: { background: "transparent" },
  },
};

export default function SignUpPage() {
  return (
    <div className="page-center">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "28px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "36px", fontWeight: 800, letterSpacing: "-1px", color: "#fff" }}>
            Tex<span style={{ color: "#6366f1" }}>ly</span>
          </div>
          <p style={{ color: "#64748b", fontSize: "13px", marginTop: "6px" }}>
            Create your account to get started
          </p>
        </div>

        <SignUp appearance={clerkDark} />
      </div>
    </div>
  );
}

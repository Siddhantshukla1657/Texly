import { SignUp } from "@clerk/nextjs";

const clerkTheme = {
  elements: {
    rootBox: { width: "100%" },
    card: {
      background: "transparent",
      border: "none",
      boxShadow: "none",
      padding: "0",
    },
    headerTitle:    { display: "none" },
    headerSubtitle: { display: "none" },
    formFieldLabel: {
      color: "#334155",
      fontSize: "12px",
      fontWeight: "600",
      textTransform: "uppercase" as const,
      letterSpacing: "0.05em",
    },
    formFieldInput: {
      background: "#FFFFFF",
      border: "1.5px solid #E1E8F0",
      borderRadius: "8px",
      color: "#0F172A",
      fontSize: "14px",
      padding: "10px 13px",
      boxShadow: "0 1px 2px rgba(15,23,42,0.05)",
    },
    formButtonPrimary: {
      background: "linear-gradient(135deg, #2563EB, #4F46E5)",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "600",
      letterSpacing: "0.01em",
      boxShadow: "0 4px 14px rgba(59,123,246,0.40)",
      border: "none",
      padding: "10px",
    },
    footerActionLink: { color: "#2563EB", fontWeight: "600" },
    dividerLine:      { background: "#E1E8F0" },
    dividerText:      { color: "#94A3B8", fontSize: "12px" },
    socialButtonsBlockButton: {
      background: "#F7F9FC",
      border: "1.5px solid #E1E8F0",
      borderRadius: "8px",
      color: "#1E293B",
      boxShadow: "0 1px 2px rgba(15,23,42,0.05)",
    },
    socialButtonsBlockButtonText: { color: "#1E293B", fontWeight: "500" },
    footer: { background: "transparent" },
    identityPreviewText: { color: "#334155" },
  },
};

export default function SignUpPage() {
  return (
    <div className="auth-shell">
      {/* ── Left branding panel ── */}
      <div className="auth-left">
        <div className="auth-logo">
          <div className="auth-logo-mark">
            <span className="auth-logo-letter">T</span>
          </div>
          <span className="auth-logo-text">Texly</span>
        </div>

        <div className="auth-left-content">
          <h1 className="auth-headline">
            The editor your<br /><em>LaTeX deserves.</em>
          </h1>
          <p className="auth-sub">
            Join thousands of researchers, students and academics who typeset better with Texly.
          </p>

          <div className="auth-features">
            {[
              {
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#93C5FD" strokeWidth="2.2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                ),
                title: "Instant PDF Preview",
                desc: "Scrollable, multi-page PDF output renders immediately after compilation.",
              },
              {
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#93C5FD" strokeWidth="2.2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                  </svg>
                ),
                title: "Project Access Codes",
                desc: "Easily share LaTeX projects with colleagues via secure access codes.",
              },
              {
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#93C5FD" strokeWidth="2.2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ),
                title: "Version History",
                desc: "Commit snapshots of your work and restore any previous version.",
              },
              {
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#93C5FD" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                ),
                title: "Always Free to Start",
                desc: "No credit card, no local install — open your browser and start typesetting.",
              },
            ].map((f) => (
              <div key={f.title} className="auth-feature">
                <div className="auth-feature-icon">{f.icon}</div>
                <div className="auth-feature-text">
                  <span className="auth-feature-title">{f.title}</span>
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-footer">
          © {new Date().getFullYear()} Texly · Professional LaTeX Editor
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-right">
        <div className="auth-form-wrap">
          <div className="auth-form-title">Create your account</div>
          <div className="auth-form-sub">Get started with Texly — it&apos;s free</div>

          <SignUp appearance={clerkTheme} />
        </div>
      </div>
    </div>
  );
}

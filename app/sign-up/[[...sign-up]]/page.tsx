import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="auth-shell">
      {/* ── Left branding panel ── */}
      <div className="auth-left">
        <div className="auth-logo">
          <img src="/logo.png" alt="Texly" style={{ width: "44px", height: "44px", objectFit: "contain" }} />
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
          <SignUp />
        </div>
      </div>
    </div>
  );
}


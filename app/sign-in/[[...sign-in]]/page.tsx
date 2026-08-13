import { SignIn } from "@clerk/nextjs";


export default function SignInPage() {
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
            Write LaTeX with<br /><em>clarity and speed.</em>
          </h1>
          <p className="auth-sub">
            A professional browser-based editor for everyone who demands precision in their documents.
          </p>

          <div className="auth-features">
            {[
              {
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#93C5FD" strokeWidth="2.2">
                    <path d="M9 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="12 17 17 22 22 17" /><line x1="17" x2="17" y1="22" y2="11" />
                  </svg>
                ),
                title: "Live PDF Compilation",
                desc: "See your output render in real-time with smooth scrollable pages.",
              },
              {
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#93C5FD" strokeWidth="2.2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                ),
                title: "Team Collaboration",
                desc: "Share projects with access codes, assign editor or viewer roles.",
              },
              {
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#93C5FD" strokeWidth="2.2">
                    <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                  </svg>
                ),
                title: "Monaco-powered Editor",
                desc: "Full LaTeX syntax support, autocompletion, and inline error markers.",
              },
              {
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#93C5FD" strokeWidth="2.2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                ),
                title: "No Installation Required",
                desc: "Everything runs in your browser — nothing to configure locally.",
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
          <SignIn />
        </div>
      </div>
    </div>
  );
}

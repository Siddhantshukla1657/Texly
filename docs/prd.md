# Texly — Product Requirements Document

> **Status:** Draft | **Last updated:** August 5, 2026 | **Owner:** Siddhant

## 1. Overview
Texly is a personal-use, browser-based LaTeX editor for research papers and technical documents — a leaner, self-hosted alternative to Overleaf. It compiles LaTeX entirely in the browser (no server-side TeX install), supports multiple independent projects, keeps a lightweight commit-based version history, and controls access through a single admin account plus per-project access codes rather than open self-service signup. Built on Next.js, deployed fully on Vercel, backed by MongoDB.

*"Texly" is a placeholder name — swap it freely, every doc uses it consistently so a rename is a find-and-replace.*

## 2. Problem Statement
This isn't a multi-tenant product — it's Siddhant's own tool for writing papers and letting a small, known set of people contribute to specific projects. Overleaf's collaboration model (invite by email, shared team billing) is more than what's needed here. What's actually needed: one admin (Siddhant) who controls everything, and a way to hand a specific project to specific people without building out a full invite/approval system — a shared code per project does that with almost no extra infrastructure.

## 3. Goals
- Compile and preview LaTeX documents entirely in-browser, live, with no server-side TeX install.
- Support multiple independent projects, each with its own files and history.
- Have exactly one admin account that can see every user, change roles, and see/grant/revoke project access.
- Let the admin gate each project behind its own access code — anyone who enters a valid code gets editor access to that project, without an approval step.
- Keep a lightweight, restorable version history per project.
- Run entirely on Vercel (frontend + API routes) plus MongoDB Atlas — no separate compile server or long-running infrastructure to babysit.

## 4. Non-Goals
- Self-service project creation for non-admin users. Only the admin creates projects.
- Real-time simultaneous co-editing with live cursors (Google-Docs-style). Deferred — see Future / Not Yet Scheduled in phases.md.
- Full CTAN package support. Only packages the client-side WASM engine supports are guaranteed to compile.
- Multiple admin accounts. The system supports the data model for it, but v1 is designed and tested around exactly one.
- Automatic access-code expiry or per-code usage limits. A code stays valid until the admin regenerates it.
- Public template gallery, billing, or mobile-optimized editing.

## 5. Target Users / Personas
| Persona | Description | Primary need |
|---|---|---|
| Admin (Siddhant) | The single owner/operator of the whole instance | Full visibility and control: every user, every project, every access grant |
| Regular user | Someone given a project's access code | Fast entry into a specific project, ability to write and commit, no interest in managing anything beyond that |

## 6. User Stories
- As the admin, I want to see every registered user in one place, so that I know who has access to what.
- As the admin, I want to change a user's role, so that I can adjust what they're allowed to do.
- As the admin, I want to see which projects a given user has access to, and grant or revoke that access directly, so that I'm not dependent on the code being the only control point.
- As the admin, I want to view and regenerate a project's access code, so that I can cut off a leaked code without affecting the project itself.
- As a regular user, I want to log in and enter an access code to unlock a project, so that I can start contributing without waiting on anyone.
- As a regular user who already has access to at least one project, I want to skip the access-code screen on future logins and land straight on my dashboard.
- As a regular user, I want to add another access code from my own dashboard, so that I can join additional projects over time.
- As any project member, I want to snapshot the current state as a commit with a message, so that I can roll back if something breaks.

## 7. Requirements

### 7.1 Functional Requirements
1. The system must have exactly one account flagged as admin.
2. The admin must be able to view a list of all registered users.
3. The admin must be able to change a user's role.
4. The admin must be able to see, per user, which projects they currently have access to.
5. The admin must be able to revoke a specific user's access to a specific project.
6. The admin must be able to grant a specific user access to a specific project directly, without that user entering a code.
7. Only the admin can create new projects.
8. Every project must have an associated access code, viewable and regenerable by the admin.
9. On login, a non-admin user with zero active project access grants must be routed to an access-code entry screen before seeing any project.
10. On login, a non-admin user with at least one active project access grant must be routed directly to their dashboard, skipping the access-code screen.
11. Entering a valid access code must grant that user editor access (view + commit, not project creation) to the corresponding project.
12. A logged-in non-admin user must be able to redeem an additional access code from their own dashboard to gain access to another project.
13. The system must let any user with project access create, edit, and delete files within that project (`.tex`, `.bib`, `.cls`, `.sty`, and image assets).
14. The system must compile the project's LaTeX source to a PDF entirely client-side, using a WASM LaTeX engine, and render it in-browser.
15. The system must surface compile errors/warnings in a readable form, linked to the source line where possible.
16. The system must let a user with editor access on a project create a commit (named snapshot) of all current file contents.
17. The system must let a user with project access view commit history and diff any two commits.
18. The system must let a user with editor access restore file contents to a past commit, creating a new commit on restore rather than overwriting history.

### 7.2 Non-Functional Requirements
- Editor-to-preview latency should feel live: recompile triggers within ~1-2s of the user pausing typing.
- All backend API routes run on Vercel's serverless/edge runtime — no persistent server process required.
- No component of the system should require infrastructure outside Vercel, MongoDB Atlas, and a managed blob store.
- Every route that touches project data checks access server-side; a user with no grant on a project gets a 403/404, never a silently empty result.
- Access codes are treated as credentials: stored hashed, not plaintext, and compared via hash on redemption.

## 8. Success Metrics
| Metric | Target | Timeframe |
|---|---|---|
| Time from "New Project" click to first compiled PDF | Under 30 seconds on the default template | v1 launch |
| Successful compile rate on default template + common packages (amsmath, graphicx, hyperref, natbib, tikz) | 100% | v1 launch |
| Time from valid access-code entry to project visible on dashboard | Immediate, no manual approval step | v1 launch |

*Proposed metrics — personal-project targets, since there's no existing user base to benchmark against.*

## 9. Constraints & Assumptions
- Constraint: must deploy fully on Vercel (Hobby or Pro tier) for both frontend and backend.
- Constraint: database is MongoDB (Atlas), not a relational database — the data model is document-oriented throughout.
- Constraint: LaTeX compilation happens client-side via WASM, bounded by whatever engine gets chosen.
- Assumption: authentication mechanics (sign-up, sign-in, session/password security) are still handled by Clerk; the admin/access-code logic is a custom layer built on top of a Clerk-authenticated session, not a replacement for it.
- Assumption: a user's role granted by redeeming a code is "editor" on that specific project. The admin can later change it (e.g. downgrade to viewer) per project.
- Assumption: regenerating a project's access code blocks *future* redemptions of the old code but does not automatically revoke access already granted to existing users — those are separate actions (regenerate vs. revoke), matching the goal of "cut off a leaked code without affecting the project."
- Assumption: any authenticated non-admin can attempt to redeem any code they're given — there's no per-user allowlist of which codes they're permitted to try.

## 10. Dependencies
- MongoDB Atlas (database)
- Clerk (authentication mechanics — sign-up/sign-in, session handling)
- Vercel Blob (image/binary asset storage)
- SwiftLaTeX or an equivalent WASM LaTeX engine (client-side compile)
- pdf.js (in-browser PDF rendering)

## 11. Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A leaked access code lets an unintended person into a project | Medium | Medium | Codes are hashed at rest; admin can regenerate a project's code instantly to cut off new redemptions, and revoke specific users' access independently |
| WASM engine doesn't support a package the user needs | Medium | Medium | Document the supported package list up front; show a clear "unsupported package" compile error instead of a silent failure |
| Two people with access to the same project overwrite each other's work | Medium | Medium | Last-write-wins with a warning if the file changed since it was last loaded; commits provide a recovery path |
| Admin account is a single point of failure (one credential) | Low | High | Out of scope to solve fully in v1; noted as an open question below |

## 12. Open Questions
- [ ] Should access codes ever expire automatically, or stay valid indefinitely until manually regenerated?
- [ ] Should there be a visible audit log (to the admin) of who redeemed which code and when?
- [ ] Should there be any protection against repeated invalid code guesses (rate limiting), or is that unnecessary for a personal-scale tool?
- [ ] Is a single point-of-failure admin account acceptable for v1, or should there be a backup-admin mechanism?

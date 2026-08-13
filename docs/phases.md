# Texly — Phases

> **Status:** Draft | **Last updated:** August 5, 2026

## Roadmap Summary
| Phase | Name | Goal | Target duration |
|---|---|---|---|
| Phase 1 | Core Editor & Client-Side Compile | A single (admin) user can write LaTeX and see a live-compiled PDF, entirely in-browser | 2-3 weeks |
| Phase 2 | Multi-File & Multi-Project Support | Admin manages multiple independent projects, each with multiple files and assets | 1-2 weeks |
| Phase 3 | Version History | Users can snapshot and restore project state via commits | 1 week |
| Phase 4 | Admin & Access Control | Admin manages users and per-project access codes; regular users redeem codes to unlock projects | 1-2 weeks |

---

## Phase 1: Core Editor & Client-Side Compile
**Goal:** A single user can create a project, write LaTeX in-browser, and see a live-compiled PDF, with no server-side TeX install anywhere in the stack.

**Scope:**
- Clerk auth wired up (sign-up/sign-in)
- One seeded admin account (`isAdmin: true` on a specific `clerkId`, set directly in MongoDB)
- One project, one file, single-user editing to prove out the core loop
- Monaco editor wired to that file
- WASM LaTeX engine integrated in a Web Worker, compiling on a debounce
- pdf.js rendering the compiled output
- Basic compile error display (raw log)

**Out of scope for this phase:** Multiple files, multiple projects, commits, access codes, admin panel.

**Deliverables:** Working single-project, single-file editor with live PDF preview, deployed on Vercel, backed by MongoDB Atlas.

**Dependencies:** Clerk keys, MongoDB Atlas cluster provisioned, WASM engine choice confirmed via a short spike.

**Exit criteria:** A signed-in user can write LaTeX and watch a correctly compiled PDF update live, for a standard article-class document using amsmath, graphicx, and hyperref.

---

## Phase 2: Multi-File & Multi-Project Support
**Goal:** The admin manages multiple independent projects, each with multiple files, images, and a bibliography.

**Scope:**
- Project CRUD and dashboard listing, **creation restricted to the admin account**
- File tree UI — create, rename, delete files within a project
- Multi-file compile (`\input`/`\include` resolve correctly, `.bib` support)
- Asset upload to Vercel Blob, referenced from the editor

**Out of scope for this phase:** Commits, access codes, non-admin users.

**Deliverables:** Full project dashboard (admin view), multi-file editor, working bibliography compile.

**Dependencies:** Phase 1 complete, Vercel Blob configured.

**Exit criteria:** The admin can run multiple independent projects at once, each compiling correctly with multiple included files and at least one image asset. Attempting project creation as a non-admin (once auth distinguishes roles) is rejected.

---

## Phase 3: Version History
**Goal:** Users with project access can snapshot project state as commits and restore past states without losing current work.

**Scope:**
- Commit creation — snapshot all current files with a message, embedded in the commit document
- Commit history list per project
- Diff view between any two commits
- Restore-to-commit, which creates a new commit rather than overwriting history

**Out of scope for this phase:** Real git semantics/export, branching.

**Deliverables:** Working commit, history, and restore UI backed by MongoDB commit documents.

**Dependencies:** Phase 2 complete.

**Exit criteria:** A user can make several commits, view a diff between any two, and successfully restore an older state.

---

## Phase 4: Admin & Access Control
**Goal:** The admin can manage users and per-project access via access codes. Regular users can redeem a code to unlock a project and commit changes within it, but can never create new projects.

**Scope:**
- Access-code field per project (hashed at rest), admin can view and regenerate it
- Access-code redemption flow: login-gate page for a non-admin with zero active grants, plus a persistent "add access code" affordance on the regular-user dashboard
- Auth Gate logic: admin → admin dashboard; non-admin with active access → straight to their dashboard; non-admin with none → access-code page
- Admin dashboard: full user list, per-user project access view, grant/revoke controls, role change
- Route-level enforcement across all existing routes: project creation stays admin-only; access-code redemption only ever grants editor rights, never project-creation rights

**Out of scope for this phase:** Automatic code expiry, redemption audit logging (both flagged as open questions in prd.md), rate limiting on redemption attempts.

**Deliverables:** Full admin panel plus the two-page login/access-code gate described in the PRD.

**Dependencies:** Phase 2 (projects must exist to attach codes to).

**Exit criteria:** The admin logs in and lands directly on the admin dashboard. A brand-new non-admin account is forced to the access-code page until a valid code is entered, after which they land on their own dashboard showing only that project, with edit/commit rights and no ability to create a project. The admin can revoke that access from the user detail view and confirm the user loses it on their next request.

---

## Future / Not Yet Scheduled
- Real-time simultaneous co-editing (CRDT via Yjs, backed by a WebSocket layer or a service like Liveblocks)
- Automatic access-code expiry / usage limits
- Redemption audit log visible to the admin
- Rate limiting on access-code redemption attempts
- Comments / track-changes style review
- Public template gallery
- Export project history to real git (via `isomorphic-git`) for portability
- Mobile editing support beyond the read-only view

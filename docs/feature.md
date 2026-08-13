# Texly — Feature List

> **Status:** Draft | **Last updated:** August 5, 2026

## Feature Summary
| # | Feature | Category | Phase | Priority | Status |
|---|---|---|---|---|---|
| 1 | Account sign-up / sign-in | Auth | Phase 1 | Must-have | Planned |
| 2 | Project creation (admin only) | Core | Phase 1 | Must-have | Planned |
| 3 | LaTeX editor (Monaco) | Core | Phase 1 | Must-have | Planned |
| 4 | Client-side compile & live preview | Core | Phase 1 | Must-have | Planned |
| 5 | Compile error display | Core | Phase 1 | Must-have | Planned |
| 6 | Multi-project dashboard | Core | Phase 2 | Must-have | Planned |
| 7 | Multi-file project support | Core | Phase 2 | Must-have | Planned |
| 8 | Image/asset upload | Core | Phase 2 | Must-have | Planned |
| 9 | Commit / snapshot creation | Version Control | Phase 3 | Must-have | Planned |
| 10 | Commit history & diff view | Version Control | Phase 3 | Must-have | Planned |
| 11 | Restore to past commit | Version Control | Phase 3 | Should-have | Planned |
| 12 | Login & access gate routing | Access Control | Phase 4 | Must-have | Planned |
| 13 | Access code redemption | Access Control | Phase 4 | Must-have | Planned |
| 14 | Add additional access code (dashboard) | Access Control | Phase 4 | Should-have | Planned |
| 15 | Admin user management | Admin | Phase 4 | Must-have | Planned |
| 16 | Admin grant / revoke project access | Admin | Phase 4 | Must-have | Planned |
| 17 | Per-project access code management | Admin | Phase 4 | Must-have | Planned |

*Priority: Must-have / Should-have / Nice-to-have. Status: Planned / In progress / Done.*

---

## 1. Account Sign-up / Sign-in
**Category:** Auth
**Phase:** Phase 1
**Priority:** Must-have

**What it does:**
Lets a person create an account and sign back in, using Clerk. Same login page for everyone, admin included — what happens after login depends on the account (see Feature 12).

**User story:**
As any user, I want to create an account, so that my identity and access persist across sessions.

**How it works:**
1. Trigger: user visits Texly, hits sign-up or sign-in.
2. Logic: Clerk handles credential collection, session issuance, and token refresh; Texly creates a local `users` document on first sign-in, linked by `clerkId`, with `isAdmin: false` by default.
3. Result: user has an active session; where they land next is decided by the Auth Gate.

**Inputs:** Email/password or OAuth provider, via Clerk's hosted flow.

**Outputs:** A `users` document, an active session.

**Edge cases & error handling:**
- Edge case: first-time sign-in for a `clerkId` with no matching `users` document → document is created on the fly before any redirect happens.

**Dependencies:** Clerk.

---

## 2. Project Creation (Admin Only)
**Category:** Core
**Phase:** Phase 1
**Priority:** Must-have

**What it does:**
Lets the admin start a new project, pre-loaded with a minimal LaTeX template. Non-admin users never see this action.

**User story:**
As the admin, I want to create a new project and start writing immediately, so that I don't lose momentum to setup.

**How it works:**
1. Trigger: admin clicks "New Project" from the admin dashboard.
2. Logic: the route checks `isAdmin` before doing anything else; a `projects` document is created with the admin as `createdBy`, a hashed access code is generated, and a default `main.tex` file is created with a basic article-class template.
3. Result: admin is dropped into the editor with a working starting point.

**Inputs:** Project name (optional, defaults to "Untitled Project").

**Outputs:** New `projects` and `files` documents, a generated access code.

**Edge cases & error handling:**
- Edge case: a non-admin somehow calls the create-project route directly → rejected with a 403, independent of any UI-level hiding of the button.

**Dependencies:** Account sign-up/sign-in.

---

## 3. LaTeX Editor (Monaco)
**Category:** Core
**Phase:** Phase 1
**Priority:** Must-have

**What it does:**
A code-editor pane for writing LaTeX source, with syntax highlighting.

**User story:**
As anyone with project access, I want a real code editor for my `.tex` files, so that writing LaTeX doesn't feel like typing into a plain textarea.

**How it works:**
1. Trigger: user with active access opens a project.
2. Logic: Monaco loads with the active file's content; edits update local state and trigger a debounced autosave.
3. Result: content is edited in-browser and persisted without an explicit save action.

**Inputs:** Keystrokes, file selection from the file tree.

**Outputs:** Updated `files.content` in MongoDB (via autosave).

**Edge cases & error handling:**
- Edge case: network drops mid-edit → local edits are retained in editor state and retried on reconnect; autosave indicator shows "unsaved" until it succeeds.
- Edge case: user's role is `viewer` → editor loads read-only, no autosave attempted.

**Dependencies:** Project creation, login & access gate routing.

---

## 4. Client-Side Compile & Live Preview
**Category:** Core
**Phase:** Phase 1
**Priority:** Must-have

**What it does:**
Compiles the active LaTeX source to a PDF entirely in the browser and renders it live as the user types.

**User story:**
As anyone with project access, I want to see my compiled PDF update as I type, so that I catch errors early.

**How it works:**
1. Trigger: user pauses typing (debounced) or hits the manual compile shortcut.
2. Logic: current file contents are passed to the WASM engine running in a Web Worker, which compiles to PDF bytes off the main thread.
3. Result: PDF bytes are handed to pdf.js and rendered in the preview pane; on failure, the error path (Feature 5) takes over.

**Inputs:** Current in-memory file contents.

**Outputs:** Rendered PDF in the preview pane.

**Edge cases & error handling:**
- Edge case: compile takes long enough that the user keeps typing → in-flight compiles are cancelled/superseded by the latest request.

**Dependencies:** LaTeX editor.

---

## 5. Compile Error Display
**Category:** Core
**Phase:** Phase 1
**Priority:** Must-have

**What it does:**
Surfaces LaTeX compile errors and warnings in a readable form.

**User story:**
As anyone with project access, I want to understand why my document failed to compile, so that I can fix it without digging through a raw log.

**How it works:**
1. Trigger: the WASM engine returns an error state instead of PDF bytes.
2. Logic: the raw engine log is parsed for file/line references where possible.
3. Result: an error panel shows the log; where a line number was parsed, the editor gutter highlights the offending line.

**Inputs:** Engine error output.

**Outputs:** Error panel content, optional gutter markers.

**Edge cases & error handling:**
- Edge case: engine output doesn't map to a parseable line number → fall back to the raw log, no gutter marker.

**Dependencies:** Client-side compile & live preview.

---

## 6. Multi-Project Dashboard
**Category:** Core
**Phase:** Phase 2
**Priority:** Must-have

**What it does:**
Shows the admin every project; shows a regular user only the projects they have active access to.

**User story:**
As a user, I want to see my accessible projects in one place, so that I can jump between them.

**How it works:**
1. Trigger: user lands on their dashboard.
2. Logic: if admin, query returns all `projects` documents. If not, query returns projects joined through active (`status: active`) `projectAccess` documents for that user.
3. Result: project cards render, sorted by most recently updated.

**Inputs:** None beyond the authenticated session.

**Outputs:** Rendered list of project cards.

**Edge cases & error handling:**
- Edge case: regular user reaches the dashboard with zero active grants → shouldn't happen given the Auth Gate, but if it does, falls back to the access-code page rather than showing an empty dashboard.

**Dependencies:** Project creation, login & access gate routing.

---

## 7. Multi-File Project Support
**Category:** Core
**Phase:** Phase 2
**Priority:** Must-have

**What it does:**
Lets a project contain more than one file.

**User story:**
As anyone with editor access, I want to split my paper across multiple files, so that long documents stay organized.

**How it works:**
1. Trigger: user creates a new file from the file tree.
2. Logic: a new `files` document is added under the project; the compile step resolves `\input`/`\include` references and pulls in `.bib` content.
3. Result: file tree updates, new file is editable, compile includes it correctly.

**Inputs:** New filename, file type.

**Outputs:** New `files` document.

**Edge cases & error handling:**
- Edge case: `\input` references a missing file → compile error surfaces (Feature 5) naming the missing file.

**Dependencies:** Project creation, client-side compile.

---

## 8. Image / Asset Upload
**Category:** Core
**Phase:** Phase 2
**Priority:** Must-have

**What it does:**
Lets a user with editor access upload images for use in `\includegraphics`.

**User story:**
As anyone with editor access, I want to add figures to my paper, so that my document isn't text-only.

**How it works:**
1. Trigger: user uploads a file via the file tree.
2. Logic: file is uploaded to Vercel Blob through a signed upload URL; an `assets` document is created referencing the resulting Blob URL.
3. Result: asset is available to the compile step, referenceable by filename from `.tex` source.

**Inputs:** Binary file (image, typically).

**Outputs:** New `assets` document, file stored in Vercel Blob.

**Edge cases & error handling:**
- Edge case: file exceeds the size limit → inline validation before upload starts.

**Dependencies:** Multi-file project support.

---

## 9. Commit / Snapshot Creation
**Category:** Version Control
**Phase:** Phase 3
**Priority:** Must-have

**What it does:**
Freezes the current content of every file in a project as a named commit.

**User story:**
As anyone with editor access, I want to snapshot the current state with a message, so that I can roll back if something breaks later.

**How it works:**
1. Trigger: user clicks "Commit" and enters a message.
2. Logic: a `commits` document is created with an embedded `files` array copying every current file's content at that moment.
3. Result: the commit appears at the top of the history panel.

**Inputs:** Commit message.

**Outputs:** New `commits` document.

**Edge cases & error handling:**
- Edge case: user commits with no message → a default message ("Snapshot — [timestamp]") is used.

**Dependencies:** Multi-file project support.

---

## 10. Commit History & Diff View
**Category:** Version Control
**Phase:** Phase 3
**Priority:** Must-have

**What it does:**
Shows the chronological list of commits and lets the user diff any two of them.

**User story:**
As anyone with project access, I want to see what changed between two points in time.

**How it works:**
1. Trigger: user opens the history panel, selects two commits.
2. Logic: for each file present in either commit's embedded array, content is diffed client-side.
3. Result: a diff view renders per changed file.

**Inputs:** Two selected commit IDs.

**Outputs:** Rendered diff, no data mutation.

**Edge cases & error handling:**
- Edge case: a file exists in one commit but not the other → shown as a full-add or full-remove.

**Dependencies:** Commit/snapshot creation.

---

## 11. Restore to Past Commit
**Category:** Version Control
**Phase:** Phase 3
**Priority:** Should-have

**What it does:**
Reverts all files in the project to match a selected past commit.

**User story:**
As anyone with editor access, I want to restore an older version, so that I don't lose work permanently.

**How it works:**
1. Trigger: user selects a past commit and clicks "Restore."
2. Logic: current `files` documents are overwritten with content from the selected commit's embedded array; a new `commits` document is immediately created capturing this restored state.
3. Result: editor reflects the restored content; history shows the restore as a new commit.

**Inputs:** Selected commit ID.

**Outputs:** Updated `files` documents, one new `commits` document.

**Edge cases & error handling:**
- Edge case: restoring while another collaborator has the project open → their next save triggers the standard last-write-wins warning.

**Dependencies:** Commit/snapshot creation.

---

## 12. Login & Access Gate Routing
**Category:** Access Control
**Phase:** Phase 4
**Priority:** Must-have

**What it does:**
Decides, right after authentication, where a user lands: admin dashboard, straight to their own dashboard, or the access-code page.

**User story:**
As a regular user who already has access to a project, I want to skip straight to my dashboard on future logins, so I'm not re-entering codes I've already used.

**How it works:**
1. Trigger: user completes Clerk authentication.
2. Logic: look up their `users` document. If `isAdmin`, route to the admin dashboard. Otherwise, query `projectAccess` for any `status: active` document belonging to them — if found, route to their dashboard; if none, route to the access-code page.
3. Result: correct landing page every time, with no manual navigation needed.

**Inputs:** Authenticated session.

**Outputs:** A routing decision (client-side redirect).

**Edge cases & error handling:**
- Edge case: user's only access grant gets revoked mid-session → doesn't retroactively kick them out of an open tab, but their next fresh login routes them back to the access-code page.

**Dependencies:** Account sign-up/sign-in.

---

## 13. Access Code Redemption
**Category:** Access Control
**Phase:** Phase 4
**Priority:** Must-have

**What it does:**
Lets a user unlock a specific project by entering its access code.

**User story:**
As a regular user, I want to enter an access code to unlock a project, so that I can start contributing without waiting on anyone.

**How it works:**
1. Trigger: user submits a code on the access-code page (or from their dashboard, see Feature 14).
2. Logic: the submitted code is hashed and compared against `projects.accessCodeHash` across all projects; on a match, a `projectAccess` document is created (or reactivated if one exists with `status: revoked`) with `role: editor`, `grantedVia: "code"`.
3. Result: the matching project appears on the user's dashboard immediately.

**Inputs:** Submitted access code string.

**Outputs:** New or reactivated `projectAccess` document.

**Edge cases & error handling:**
- Edge case: code doesn't match any project → generic "invalid code" error, no indication of why (avoids leaking whether close-but-wrong guesses are "almost right").
- Edge case: user already has active access to the matching project → treated as a no-op success rather than an error.

**Dependencies:** Login & access gate routing, per-project access code management (Feature 17).

---

## 14. Add Additional Access Code (Dashboard)
**Category:** Access Control
**Phase:** Phase 4
**Priority:** Should-have

**What it does:**
Lets an already-active user redeem another project's code without logging out.

**User story:**
As a regular user, I want to add another access code from my dashboard, so that I can join additional projects over time.

**How it works:**
1. Trigger: user clicks "+ Add access code" on their dashboard.
2. Logic: same redemption logic as Feature 13, triggered from a different entry point.
3. Result: on success, the new project appears on the dashboard without a page reload.

**Inputs:** Submitted access code string.

**Outputs:** New `projectAccess` document.

**Edge cases & error handling:** Same as Feature 13.

**Dependencies:** Access code redemption.

---

## 15. Admin User Management
**Category:** Admin
**Phase:** Phase 4
**Priority:** Must-have

**What it does:**
Lets the admin see every registered user and change their role.

**User story:**
As the admin, I want to see every user and change their role, so that I control what people are allowed to do.

**How it works:**
1. Trigger: admin opens the Users section of the admin dashboard.
2. Logic: query returns all `users` documents; selecting one queries their `projectAccess` documents for a per-project breakdown.
3. Result: admin sees a full list, and a detail view per user showing exactly what they have access to and at what role.

**Inputs:** None to view; role selection to change.

**Outputs:** Updated `projectAccess.role` (per-project) on change.

**Edge cases & error handling:**
- Edge case: admin tries to change their own `isAdmin` flag → blocked, since v1 assumes exactly one admin and this would strand the account with no way back in.

**Dependencies:** Account sign-up/sign-in.

---

## 16. Admin Grant / Revoke Project Access
**Category:** Admin
**Phase:** Phase 4
**Priority:** Must-have

**What it does:**
Lets the admin directly add or remove a user's access to a specific project, bypassing the code entirely.

**User story:**
As the admin, I want to grant or revoke a user's project access directly, so that I'm not dependent on the code being the only control point.

**How it works:**
1. Trigger: admin selects a user, then a project, and chooses Grant or Revoke.
2. Logic: Grant creates/reactivates a `projectAccess` document with `grantedVia: "admin-manual"`. Revoke sets an existing document's `status` to `revoked` and stamps `revokedAt`.
3. Result: the user's dashboard reflects the change on their next request.

**Inputs:** Target user, target project, action.

**Outputs:** Created, reactivated, or revoked `projectAccess` document.

**Edge cases & error handling:**
- Edge case: admin revokes access for a user who has the project open → their next API call 403s (see design.md edge cases).

**Dependencies:** Admin user management.

---

## 17. Per-Project Access Code Management
**Category:** Admin
**Phase:** Phase 4
**Priority:** Must-have

**What it does:**
Lets the admin view (in a revealable form) and regenerate a project's access code.

**User story:**
As the admin, I want to view and regenerate a project's access code, so that I can cut off a leaked code without affecting the project itself.

**How it works:**
1. Trigger: admin opens a project's settings from the admin dashboard.
2. Logic: the current code isn't stored in reversible form (it's hashed), so "view" actually means "reveal the code once, right after generation/regeneration" — after that, only regeneration is possible, not re-viewing the old one. Regenerating creates a new random code, hashes it, and overwrites `accessCodeHash` and `accessCodeUpdatedAt`.
3. Result: the new code is shown once to the admin to copy/share; existing `projectAccess` grants are untouched.

**Inputs:** None to trigger regeneration.

**Outputs:** New `accessCodeHash`, a plaintext code shown once to the admin.

**Edge cases & error handling:**
- Edge case: admin navigates away before copying the newly generated code → they simply regenerate again; there's no recovery of a code once its reveal screen is dismissed, by design, since it isn't stored in plaintext.

**Dependencies:** Project creation (admin only).

---

## Deferred / Future Features
- **Real-time simultaneous co-editing** — needs CRDT (Yjs) plus a WebSocket layer; deliberately deferred to keep v1 entirely on Vercel's request/response model.
- **Access-code expiry / usage limits** — codes are indefinite until manually regenerated in v1.
- **Redemption audit log** — who redeemed which code and when, visible to the admin.
- **Rate limiting on redemption attempts.**
- **Comments / track-changes review.**
- **Export to real git** via `isomorphic-git`.

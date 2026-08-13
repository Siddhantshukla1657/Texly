# Texly — Todo

> **Last updated:** August 5, 2026. Check items off as they're completed; keep this file in sync with actual progress.

## Phase 1: Core Editor & Client-Side Compile
- [ ] Set up Next.js app (App Router), deploy skeleton to Vercel
- [ ] Provision MongoDB Atlas cluster, wire up Mongoose
- [ ] Set up Clerk auth (sign-up/sign-in, session middleware)
- [ ] Create `users` collection/schema + on-first-sign-in document creation
- [ ] Manually seed one admin user (`isAdmin: true` on your own `clerkId`)
- [ ] Spike: compare WASM LaTeX engines (SwiftLaTeX `pdftex.js` vs `xetex.js` vs Tectonic-wasm) against a real article-class doc with amsmath/graphicx/hyperref
- [ ] Integrate chosen WASM engine in a Web Worker
- [ ] Build Monaco editor pane wired to a single `main.tex`
- [ ] Wire debounced compile trigger (typing pause + manual shortcut)
- [ ] Integrate pdf.js for preview rendering
- [ ] Build compile error panel (raw log display)
- [ ] Create `projects` and `files` collections/schemas
- [ ] End-to-end test: sign in as admin → write LaTeX → see live compiled PDF

## Phase 2: Multi-File & Multi-Project Support
- [ ] Build admin dashboard with project list
- [ ] Build "New Project" flow (name, default template file), gate the route to admin only
- [ ] Build file tree UI (create/rename/delete files)
- [ ] Extend compile step to resolve `\input`/`\include` across multiple files
- [ ] Add `.bib` support to the compile pipeline
- [ ] Set up Vercel Blob, signed upload URL route
- [ ] Create `assets` collection/schema, wire asset upload from the file tree
- [ ] Add image size validation (client-side, before upload)
- [ ] End-to-end test: multi-project dashboard, multi-file compile with a figure and bibliography; confirm project creation is rejected for a non-admin session

## Phase 3: Version History
- [ ] Create `commits` collection/schema with embedded `files` array
- [ ] Build "Commit" action (message input, snapshot all current files)
- [ ] Build commit history panel (chronological list, author, timestamp)
- [ ] Build diff view between two selected commits (client-side diffing, e.g. `diff-match-patch`)
- [ ] Build restore-to-commit action (writes a new commit, doesn't overwrite history)
- [ ] End-to-end test: make several commits, diff two of them, restore an older one

## Phase 4: Admin & Access Control
- [ ] Create `projectAccess` collection/schema (role, status, grantedVia, timestamps)
- [ ] Add hashed `accessCodeHash` + `accessCodeUpdatedAt` fields to `projects`, generate a code on project creation
- [ ] Build the Auth Gate helper (admin check → active-access check → routing decision), use it both server-side and for client redirects
- [ ] Build the access-code entry page
- [ ] Build access-code redemption route + hashing/comparison logic
- [ ] Build "+ Add access code" affordance on the regular-user dashboard
- [ ] Build admin dashboard "Users" section: list all users
- [ ] Build admin user detail view: per-user project access list, role control
- [ ] Build admin grant/revoke actions
- [ ] Build admin per-project access-code view (reveal-once) and regenerate action
- [ ] Apply role checks (editor vs viewer) across all file/commit mutation routes
- [ ] Apply admin-only checks across project create/rename/delete and all `/api/admin/*` routes
- [ ] End-to-end test: admin logs in → admin dashboard. Fresh non-admin account → forced to access-code page → enters valid code → lands on dashboard with that project, can edit/commit, cannot create a project. Admin revokes access → user's next request 403s.

## Backlog / Unscheduled
- [ ] Real-time simultaneous co-editing (CRDT/Yjs spike)
- [ ] Access-code expiry / usage limits
- [ ] Redemption audit log for the admin
- [ ] Rate limiting on access-code redemption attempts
- [ ] Comments / track-changes review flow
- [ ] Public template gallery
- [ ] Export project to real git via `isomorphic-git`
- [ ] Mobile read-only view (compiled PDF + file browsing)

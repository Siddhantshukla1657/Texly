# Texly — Development Task Tracker

> **Last updated:** August 5, 2026. Keep this file in sync with actual project progress.

## Phase 1: Core Editor & Server-Proxied Compile
- [x] Set up Next.js app (App Router), deploy skeleton to Vercel
- [x] Provision MongoDB Atlas cluster, wire up Mongoose
- [x] Set up Clerk auth (sign-up/sign-in, session middleware)
- [x] Create `users` collection/schema + on-first-sign-in document creation
- [x] Seed admin user (`isAdmin: true`)
- [x] Implement server-proxied compilation API (`/api/compile`) with TeX Live 2026 support
- [x] Build Monaco editor pane wired to project source files
- [x] Wire compilation triggers (wax seal button + keyboard shortcut)
- [x] Integrate PDF.js (`pdfjs-dist`) for canvas preview rendering
- [x] Build compile error log panel
- [x] Create `projects` and `files` collections/schemas
- [x] End-to-end test: sign in → write LaTeX → see compiled PDF

## Phase 2: Multi-File & Multi-Project Support
- [x] Build admin dashboard with project list
- [x] Build "New Project" flow (admin-gated)
- [x] Build file tree UI (create/rename/delete files)
- [x] Extend compile step to resolve `\input`/`\include` recursively across files
- [x] Add preamble `.cls`, `.sty`, and `.bib` filecontents injection
- [x] Set up Vercel Blob storage integration
- [x] Create `assets` collection/schema, wire image asset upload from file tree
- [x] Base64 image payload compilation via Ytotech TeX Live 2026 API
- [x] End-to-end test: multi-project dashboard, multi-file compile with figures and packages

## Phase 3: Version History
- [x] Create `commits` collection/schema with embedded `files` snapshot array
- [x] Build "Commit" snapshot action with commit message input
- [x] Build commit history drawer (chronological list, author, timestamp)
- [x] Build diff view between commits
- [x] Build restore-to-commit action
- [x] End-to-end test: snapshot commits, view history, and restore historic states

## Phase 4: Admin & Access Control
- [x] Create `projectAccess` collection/schema (role, status, grantedVia, timestamps)
- [x] Add hashed `accessCodeHash` fields to `projects`
- [x] Build central `AuthGate` helper (`lib/auth.ts`)
- [x] Build access code redemption page (`/access-code`)
- [x] Build access code redemption route + hashing comparison logic
- [x] Build admin dashboard (`/admin`): list all users, roles, and project access grants
- [x] Build admin grant/revoke actions
- [x] Build admin per-project access-code view & regenerate actions
- [x] Apply role checks (`editor` vs `viewer`) across file/commit mutation routes
- [x] End-to-end test: admin access, access code redemption, and role enforcement

## Future Polish & Enhancements
- [ ] Real-time simultaneous collaborative editing (Yjs / CRDT spike)
- [ ] Rate limiting on access-code redemption attempts
- [ ] Custom LaTeX template picker on project creation

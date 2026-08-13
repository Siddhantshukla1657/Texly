# Texly — Project Roadmap & Phases

> **Status:** Production Release | **Last updated:** August 5, 2026

## Roadmap Summary

| Phase | Milestone | Scope & Deliverables | Status |
|---|---|---|---|
| **Phase 1** | Core Editor & Server-Proxied Compile | Next.js App Router, Clerk Auth, Monaco Editor, TeX Live 2026 Compilation Route, PDF.js Canvas Preview | **Completed** |
| **Phase 2** | Multi-File & Asset Support | File tree CRUD, recursive `\input`/`\include` inlining, Vercel Blob asset upload, Base64 PNG graphics compilation | **Completed** |
| **Phase 3** | Version Control Snapshots | Commit snapshots, commit history drawer, file tree diffs, and historic commit restoration | **Completed** |
| **Phase 4** | Access Control & Admin Portal | Hashed access codes, user redemption flow (`/access-code`), Admin management portal (`/admin`) | **Completed** |

---

## Phase Breakdown & Architecture Progression

### Phase 1: Core Editor & Server-Proxied Compile (Completed)
- Next.js 16 application skeleton setup with Clerk Authentication.
- MongoDB Atlas connection wired up with Mongoose ORM models (`User`, `Project`, `File`).
- Monaco Editor integration for browser LaTeX editing.
- Server-proxied LaTeX compilation route (`/api/compile`) targeting TeX Live 2026.
- Interactive PDF.js canvas preview component (`PdfPreview.tsx`) with Web Worker processing.

### Phase 2: Multi-File & Asset Support (Completed)
- Multi-file project management with file tree UI.
- Recursive `\input{}` and `\include{}` dependency inlining.
- Preamble filecontents embedding for `.cls`, `.sty`, and `.bib` files.
- Vercel Blob storage integration for binary image assets.
- Base64 image payload transmission to Ytotech TeX Live 2026 for native `\includegraphics` rendering.

### Phase 3: Version Control (Completed)
- Mongoose schema for document snapshot commits.
- "Create Commit" feature capturing all project files.
- Version history drawer with commit logs and restore capabilities.

### Phase 4: Access Control & Admin Portal (Completed)
- Access Code system with bcrypt-hashed keys.
- Access code redemption page (`/access-code`) granting project `Editor` permissions.
- Centralized `AuthGate` helper (`lib/auth.ts`) enforcing role permissions across API handlers.
- Admin management dashboard (`/admin`) for user oversight, manual access grants/revocations, and code rotation.

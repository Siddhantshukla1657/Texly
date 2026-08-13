# Texly — Feature Matrix & Specifications

> **Status:** Active Specifications | **Last updated:** August 5, 2026

## Feature Summary Matrix

| # | Feature | Category | Priority | Status |
|---|---|---|---|---|
| 1 | Account sign-up / sign-in (Clerk) | Auth | Must-have | **Done** |
| 2 | Project creation (Admin only) | Core | Must-have | **Done** |
| 3 | Monaco LaTeX code editor | Core | Must-have | **Done** |
| 4 | Server-proxied compile & live PDF preview (TeX Live 2026) | Core | Must-have | **Done** |
| 5 | Structured compile error display & logs | Core | Must-have | **Done** |
| 6 | Multi-project dashboard | Core | Must-have | **Done** |
| 7 | Multi-file project & `\input`/`\include` inlining | Core | Must-have | **Done** |
| 8 | Image asset upload (Vercel Blob) & Base64 compilation | Core | Must-have | **Done** |
| 9 | Document snapshot creation (Commits) | Version Control | Must-have | **Done** |
| 10 | Commit history & diff inspection | Version Control | Must-have | **Done** |
| 11 | Restore document to past commit | Version Control | Should-have | **Done** |
| 12 | Login & access gate routing (`lib/auth.ts`) | Access Control | Must-have | **Done** |
| 13 | Access code redemption page (`/access-code`) | Access Control | Must-have | **Done** |
| 14 | Admin user management (`/admin`) | Admin | Must-have | **Done** |
| 15 | Admin grant / revoke project access | Admin | Must-have | **Done** |
| 16 | Admin access code viewing & regeneration | Admin | Must-have | **Done** |

---

## 1. Authentication & Security
- **Engine:** Integrated via `@clerk/nextjs`.
- **Role Detection:** Server-side user role resolution during login routes admin accounts to `/admin` and regular users to `/dashboard`.

## 2. Monaco Editor & Workspace
- **Editor:** Monaco Code Editor with LaTeX syntax highlighting, line numbers, automatic bracket completion, and error indicators.
- **File Management:** Side drawer file tree allowing users to create, rename, and delete `.tex`, `.sty`, `.cls`, and `.bib` files.

## 3. TeX Live 2026 Compilation Engine
- **Server Route Handler:** `app/api/compile/route.ts` preprocesses project files, inlines imports, embeds preamble files, and converts image assets into Base64 JSON resources.
- **Primary Engine:** Ytotech TeX Live 2026 API (`https://latex.ytotech.com/builds/sync`).
- **Fallback Engine:** TeXLive.net CGI fallback compiler.
- **PDF Canvas Rendering:** PDF bytes converted into `Uint8Array` in `public/latex.worker.js` and rendered visually using PDF.js.

## 4. Version Control & Snapshots
- **Commits:** Full file tree snapshot saved under the `commits` collection in MongoDB.
- **Restore:** Reverts active workspace files to the exact state of a historic commit.

## 5. Access Control & Admin Dashboard
- **Hashed Access Codes:** Projects store hashed access codes; users gain `Editor` or `Viewer` access upon redemption.
- **Admin Panel:** `/admin` dashboard allows administrators to manage platform users, inspect project permissions, grant/revoke access directly, and regenerate access codes.

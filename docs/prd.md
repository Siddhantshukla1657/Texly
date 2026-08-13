# Texly — Product Requirements Document (PRD)

> **Status:** Production Release | **Last updated:** August 5, 2026 | **Owner:** Siddhant

## 1. Executive Summary

**Texly** is a personal-use, browser-based LaTeX editing platform designed for research papers, technical reports, and academic publishing. It provides a lightweight, focused alternative to heavy commercial SaaS platforms like Overleaf. 

Texly compiles LaTeX documents via a server-proxied pipeline targeting **Ytotech TeX Live 2026** (with TeXLive.net as fallback), supports multi-file project structures and binary graphics assets, provides version control snapshot history, and secures project access via hashed access codes and role-based permissions.

---

## 2. Product Goals & Vision

- **High-Fidelity Compilation:** Compile LaTeX documents using full TeX Live 2026 distributions with CTAN package support and binary image rendering (`.png`, `.jpg`, `.pdf`).
- **Streamlined Workflow:** Provide VS Code-quality browser editing via Monaco Editor coupled with interactive PDF.js canvas previewing.
- **Project Isolation & Access Control:** Admin-controlled project creation coupled with pull-based access code sharing (`Editor` vs. `Viewer` roles).
- **Lightweight Infrastructure:** Deployed on Vercel with serverless Next.js API routes, MongoDB Atlas for metadata persistence, and Vercel Blob for asset storage.

---

## 3. Target User Roles & Personas

| Role | Access Level | Description |
|---|---|---|
| **Administrator** | System-Wide Admin | Single owner/operator (`isAdmin: true`). Full visibility across all registered users, project creation rights, manual access granting/revoking, and access code management. |
| **Project Editor** | Scoped Project Access | Regular user who has redeemed a valid project access code. Allowed to edit `.tex` source files, upload images, compile documents, and create commit snapshots. |
| **Project Viewer** | Read-Only Project Access | User assigned read-only rights. Allowed to view project files, view commit history, and preview/download compiled PDFs. |

---

## 4. System Requirements & Functional Specifications

### 4.1 LaTeX Preprocessing & Compilation Engine
1. The compilation API (`POST /api/compile`) must accept a main document identifier and project file map.
2. The preprocessor must recursively inline all `\input{}` and `\include{}` directives.
3. Auxiliary preamble files (`.cls`, `.sty`, `.bib`) must be injected into document preambles.
4. Binary image assets must be encoded as Base64 JSON resources and transmitted to Ytotech TeX Live 2026 (`https://latex.ytotech.com/builds/sync`) to support native `\includegraphics` rendering.
5. In case of primary engine timeout or disruption, the compilation route must automatically fail over to TeXLive.net.

### 4.2 Auth & Permission Guarding
1. User registration and authentication managed by Clerk.
2. Every server route must evaluate session credentials against MongoDB `users` and `projectAccess` records.
3. Non-admin users attempting to access unauthorized projects must be redirected to `/access-code`.
4. Admin privileges are assigned through the product's admin controls and are not derived from a hardcoded email address.

### 4.3 Version History & Snapshots
1. Users with Editor permissions must be able to save document snapshots with custom commit messages.
2. Commits store an immutable embedded copy of all project files.
3. Users must be able to restore the workspace to any previous commit snapshot.

<p align="center">
  <img src="public/logo.png" alt="Texly Logo" width="120" />
</p>

<h1 align="center">Texly — Browser-Based LaTeX Editor</h1>

<p align="center">
  <strong>Write, compile, and preview LaTeX documents entirely in your browser.</strong><br/>
  Built with Next.js, Monaco Editor, MongoDB, and Clerk.
</p>

<p align="center">
  <a href="https://github.com/Siddhantshukla1657/Texly">
    <img src="https://img.shields.io/badge/GitHub-Texly-2D3A4A?style=flat-square&logo=github" alt="GitHub"/>
  </a>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb" alt="MongoDB"/>
  <img src="https://img.shields.io/badge/Clerk-Auth-6C47FF?style=flat-square&logo=clerk" alt="Clerk"/>
</p>

---

## 🌟 Key Features

* 📝 **Monaco Code Editor**: Professional LaTeX code editing powered by VS Code's editor engine, featuring syntax highlighting, auto-completion, line numbers, and auto-closing brackets.
* ⚡ **Seamless LaTeX Compilation**: Server-proxied compilation (`/api/compile`) utilizing a LaTeX compilation engine to build PDF documents reliably without browser CORS restrictions.
* 📄 **Interactive PDF Preview**: Dynamic canvas renderer using `pdfjs-dist` with zoom controls, multi-page layout, and compilation error log display.
* 🔐 **Authentication & Access Control**: Secure login and sign-up powered by **Clerk**, supporting role-based authorization (Admins & Project Collaborators).
* 🔑 **Access Code Grant System**: Share projects with team members using hashed access codes for fine-grained Editor and Viewer permissions.
* 📜 **Version History & Commits**: Save document snapshots with custom commit messages, view commit logs, and inspect previous revisions.
* 📁 **Multi-File & Asset Support**: Create and manage multiple `.tex` files per project and upload assets (images, figures) stored via **Vercel Blob**.
* 🛠️ **Admin Dashboard**: Dedicated management portal (`/admin`) for platform administrators to monitor users, assign roles, and manage active project access codes.

---

## 🛠️ Technology Stack

| Category | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Server Components & Route Handlers) |
| **Language** | TypeScript |
| **Frontend UI** | React 19, Tailwind CSS, Monaco Editor (`@monaco-editor/react`) |
| **PDF Rendering** | PDF.js (`pdfjs-dist`) |
| **Authentication** | Clerk (`@clerk/nextjs`) |
| **Database** | MongoDB Atlas with Mongoose ORM |
| **Asset Storage** | Vercel Blob (`@vercel/blob`) |
| **Toast Notifications** | `react-hot-toast` |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v18+ recommended)
* [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
* A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) database cluster
* A [Clerk](https://clerk.com/) application project

---

### Installation & Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Siddhantshukla1657/Texly.git
   cd Texly
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory (or update `.env`) with your configuration:

   ```env
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   CLERK_WEBHOOK_SECRET=whsec_...

   # Clerk Authentication Routes
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
   NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

   # MongoDB Connection String
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/texly?retryWrites=true&w=majority

   # Vercel Blob Storage Token
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to start using Texly.

---

## 👑 Default Admin Account

By default, accounts registered with **`siddhantshukla2022@gmail.com`** are automatically assigned administrative privileges (`isAdmin: true`) upon initial login or registration and redirected to the `/admin` dashboard.

---

## 📁 Project Architecture

```
Texly/
├── app/
│   ├── (auth)/             # Clerk Sign-in & Sign-up pages
│   ├── access-code/        # Access code redemption page
│   ├── admin/              # Admin dashboard & management UI
│   ├── api/                # API Route Handlers
│   │   ├── access-code/    # Code redemption endpoints
│   │   ├── admin/          # Admin user/project control endpoints
│   │   ├── compile/        # Server-side LaTeX compilation API
│   │   ├── files/          # File CRUD operations
│   │   ├── me/             # User access & role inspection
│   │   └── projects/       # Project CRUD & listing endpoints
│   ├── dashboard/          # User projects dashboard
│   ├── projects/[id]/      # Core LaTeX editor page & workflow
│   ├── globals.css         # Global styles & design system tokens
│   ├── layout.tsx          # Root app layout & Clerk provider
│   └── page.tsx            # Auth router & landing logic
├── components/
│   └── editor/
│       ├── MonacoEditor.tsx# Monaco LaTeX editor component
│       └── PdfPreview.tsx  # PDF.js canvas preview component
├── lib/
│   ├── auth.ts             # Auth context & permission check utilities
│   ├── db.ts               # Mongoose MongoDB connection cacher
│   └── models.ts           # Mongoose schemas (User, Project, Access, Commit)
├── public/
│   └── latex.worker.js     # Web Worker for document compilation routing
└── next.config.ts          # Next.js configuration
```

---

## 🌐 Production Deployment (Vercel)

1. Push your code to GitHub.
2. Import the repository into **Vercel**.
3. Under **Project Settings $\rightarrow$ Environment Variables**, populate all keys listed in `.env.local`.
4. In **MongoDB Atlas $\rightarrow$ Network Access**, ensure IP `0.0.0.0/0` is whitelisted so Vercel Serverless Functions can connect to your database cluster.
5. Deploy!

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).

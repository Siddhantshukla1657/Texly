"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import {
  IconDocument,
  IconFolder,
  IconHistory,
  IconKey,
  IconEdit,
  IconLock,
} from "@/components/icons";
import WaxSealButton from "@/components/editor/WaxSealButton";
import StitchedSeamDivider from "@/components/editor/StitchedSeamDivider";

const MonacoEditor = dynamic(() => import("@/components/editor/MonacoEditor"), { ssr: false });
const PdfPreview = dynamic(() => import("@/components/editor/PdfPreview"), { ssr: false });

interface FileDoc {
  _id: string;
  filename: string;
  content: string;
  isMainTex: boolean;
  updatedAt: string;
}

interface Asset {
  _id: string;
  filename: string;
  blobUrl: string;
}

interface Project {
  _id: string;
  name: string;
}

type CompileStatus = "idle" | "compiling" | "success" | "error";

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileDoc[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [compileLog, setCompileLog] = useState("");
  const [compileStatus, setCompileStatus] = useState<CompileStatus>("idle");
  const [isEditor, setIsEditor] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showCommit, setShowCommit] = useState(false);
  const [commitMsg, setCommitMsg] = useState("");
  const [committing, setCommitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [editorWidthPercent, setEditorWidthPercent] = useState<number>(50);

  // Share state
  const [shareRole, setShareRole] = useState<"editor" | "viewer">("viewer");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const compileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeFile = files.find((f) => f._id === activeFileId);

  // Init worker
  useEffect(() => {
    const worker = new Worker("/latex.worker.js");
    worker.onmessage = (e) => {
      if (e.data.type === "pdf") {
        setPdfBytes(new Uint8Array(e.data.pdf));
        setCompileLog(e.data.log || "");
        setCompileStatus("success");
      } else if (e.data.type === "error") {
        setCompileLog(e.data.log || "Unknown error");
        setCompileStatus("error");
      }
    };
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  // Load project
  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => {
        if (r.status === 403) {
          toast.error("Access removed. Redirecting to dashboard.");
          router.push("/dashboard");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setProject(data.project);
        setFiles(data.files || []);
        setAssets(data.assets || []);

        const mainFile = data.files?.find((f: FileDoc) => f.isMainTex) || data.files?.[0];
        if (mainFile) {
          setActiveFileId(mainFile._id);
          setEditorContent(mainFile.content);
        }
        setLoading(false);
      });
  }, [id, router]);

  // Check role
  useEffect(() => {
    fetch("/api/me/access")
      .then((r) => r.json())
      .then((data) => {
        const grant = data.grants?.find(
          (g: { projectId: { _id: string }; role: string }) => g.projectId._id === id
        );
        if (grant) setIsEditor(grant.role === "editor");
        else if (data.isAdmin) setIsEditor(true);
      });
  }, [id]);

  // Compile
  const compile = useCallback(
    (currentContent: string, allFiles: FileDoc[]) => {
      if (!workerRef.current) return;
      setCompileStatus("compiling");

      const fileMap: Record<string, string> = {};
      for (const f of allFiles) {
        fileMap[f.filename] = f._id === activeFileId ? currentContent : f.content;
      }
      for (const a of assets) {
        fileMap[a.filename] = a.blobUrl;
      }

      const mainFile = allFiles.find((f) => f.isMainTex)?.filename || allFiles[0]?.filename;
      if (!mainFile) return;

      workerRef.current.postMessage({ type: "compile", files: fileMap, mainFile });
    },
    [activeFileId, assets]
  );

  function handleEditorChange(value: string) {
    setEditorContent(value);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("unsaved");
    saveTimer.current = setTimeout(() => {
      saveFile(activeFileId!, value);
    }, 800);
  }

  async function saveFile(fileId: string, content: string) {
    if (!isEditor) return;
    setSaveStatus("saving");
    try {
      await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      setSaveStatus("saved");
      setFiles((prev) => prev.map((f) => (f._id === fileId ? { ...f, content } : f)));
    } catch {
      setSaveStatus("unsaved");
    }
  }

  function switchFile(file: FileDoc) {
    setActiveFileId(file._id);
    setEditorContent(file.content);
    setSaveStatus("saved");
  }

  async function createFile(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/projects/${id}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: newFileName }),
    });
    const data = await res.json();
    if (res.ok) {
      setFiles((prev) => [...prev, data.file]);
      setShowNewFile(false);
      setNewFileName("");
      switchFile(data.file);
    } else {
      toast.error(data.error);
    }
  }

  async function deleteFile(fileId: string) {
    if (!confirm("Delete this file?")) return;
    const res = await fetch(`/api/files/${fileId}`, { method: "DELETE" });
    if (res.ok) {
      const remaining = files.filter((f) => f._id !== fileId);
      setFiles(remaining);
      if (activeFileId === fileId && remaining.length > 0) {
        switchFile(remaining[0]);
      }
    } else {
      const data = await res.json();
      toast.error(data.error);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const uploadedFiles = Array.from(e.target.files || []);
    if (uploadedFiles.length === 0) return;

    let successCount = 0;
    for (const file of uploadedFiles) {
      const relPath = file.webkitRelativePath || file.name;
      const sanitizedName = relPath.replace(/[^a-zA-Z0-9._\-/]/g, "_");

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (>10MB)`);
        continue;
      }

      const isTexOrCode = /\.(tex|bib|sty|cls|txt|md)$/i.test(file.name);

      if (isTexOrCode) {
        const textContent = await file.text();
        const res = await fetch(`/api/projects/${id}/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: sanitizedName, content: textContent }),
        });
        const data = await res.json();
        if (res.ok) {
          setFiles((prev) => [...prev.filter((f) => f.filename !== sanitizedName), data.file]);
          successCount++;
        }
      } else {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/projects/${id}/assets`, { method: "POST", body: formData });
        const data = await res.json();
        if (res.ok) {
          setAssets((prev) => [...prev.filter((a) => a.filename !== sanitizedName), data.asset]);
          successCount++;
        }
      }
    }

    if (successCount > 0) {
      toast.success(`Uploaded ${successCount} file(s)`);
    }
  }

  async function createCommit(e: React.FormEvent) {
    e.preventDefault();
    setCommitting(true);
    try {
      const res = await fetch(`/api/projects/${id}/commits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: commitMsg }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Commit saved");
        setShowCommit(false);
        setCommitMsg("");
      } else {
        toast.error(data.error);
      }
    } finally {
      setCommitting(false);
    }
  }

  async function handleGenerateCode() {
    setGeneratingCode(true);
    try {
      const res = await fetch(`/api/projects/${id}/access-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: shareRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedCode(data.code);
        toast.success("Access code generated");
      } else {
        toast.error(data.error);
      }
    } finally {
      setGeneratingCode(false);
    }
  }

  // Ctrl+Enter compile shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        compile(editorContent, files);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [compile, editorContent, files]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-full w-full"
        style={{ height: "100vh", background: "var(--ink)" }}
      >
        <div className="spinner spinner-ink" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full" style={{ height: "100vh", overflow: "hidden", background: "var(--ink)" }}>
      {/* Top Navbar Header (Ink Surface) */}
      <div
        style={{
          height: "46px",
          background: "var(--ink)",
          borderBottom: "1px solid rgba(246, 242, 232, 0.12)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: "16px",
        }}
      >
        {/* Brand */}
        <Link
          href="/dashboard"
          style={{
            fontSize: "16px",
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            color: "var(--parchment)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          Texly
        </Link>

        <span style={{ color: "var(--parchment-35)" }}>/</span>

        {/* Project Title */}
        <span
          style={{
            color: "var(--parchment)",
            fontSize: "13px",
            fontWeight: 500,
            maxWidth: "240px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {project?.name}
        </span>

        {/* Access Role Badge */}
        <span className={`badge ${isEditor ? "badge-parchment" : "badge-amber"}`} style={{ fontSize: "10px" }}>
          {isEditor ? "Editor" : "Viewer (Read Only)"}
        </span>

        <div style={{ flex: 1 }} />

        {/* Save indicator */}
        <span style={{ fontSize: "11px", color: "var(--parchment-60)", fontFamily: "var(--font-mono)" }}>
          {saveStatus === "saving" ? "Saving…" : saveStatus === "unsaved" ? "Unsaved" : "Saved"}
        </span>

        <div style={{ width: "1px", height: "16px", background: "rgba(246,242,232,0.15)" }} />

        {/* Action Controls */}
        {isEditor && (
          <button
            className="btn btn-secondary-ink btn-sm"
            onClick={() => setShowCommit(true)}
          >
            Commit
          </button>
        )}

        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setShowShare(true);
            setGeneratedCode(null);
          }}
        >
          <IconKey size={14} />
          Share
        </button>

        <button
          className="btn btn-ghost-ink btn-icon"
          onClick={() => setShowHistory((s) => !s)}
          title="Version History"
          style={{ color: showHistory ? "var(--wax-amber)" : undefined }}
        >
          <IconHistory size={16} />
        </button>

        <UserButton />
      </div>

      {/* Main Workspace split */}
      <div className="flex flex-1 overflow-hidden" ref={containerRef}>
        {/* Left: File Tree Sidebar (Ink Surface) */}
        <div
          style={{
            width: "220px",
            background: "#15181E",
            borderRight: "1px solid rgba(246, 242, 232, 0.1)",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          {/* File Tree Header */}
          <div
            style={{
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(246, 242, 232, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--parchment-60)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <IconFolder size={14} />
              Files
            </div>
            {isEditor && (
              <button
                className="btn btn-ghost-ink btn-icon"
                onClick={() => setShowNewFile(true)}
                title="New file"
                style={{ padding: "2px 4px" }}
              >
                +
              </button>
            )}
          </div>

          {/* File list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }} className="dark-scrollbar">
            {files.map((file) => {
              const isActive = activeFileId === file._id;
              return (
                <div
                  key={file._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "6px 12px",
                    cursor: "pointer",
                    background: isActive ? "rgba(246, 242, 232, 0.08)" : "transparent",
                    borderLeft: isActive ? "2px solid var(--verdigris)" : "2px solid transparent",
                    color: isActive ? "var(--parchment)" : "var(--parchment-60)",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono)",
                    gap: "8px",
                  }}
                  onClick={() => switchFile(file)}
                >
                  <IconDocument size={14} style={{ color: isActive ? "var(--verdigris)" : "inherit" }} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {file.filename}
                  </span>
                  {isEditor && !file.isMainTex && (
                    <button
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--parchment-35)",
                        cursor: "pointer",
                        fontSize: "12px",
                        padding: "2px",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFile(file._id);
                      }}
                      title="Delete file"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}

            {/* Assets */}
            {assets.length > 0 && (
              <>
                <div
                  style={{
                    padding: "10px 12px 4px",
                    fontSize: "10px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--parchment-35)",
                  }}
                >
                  Assets
                </div>
                {assets.map((asset) => (
                  <div
                    key={asset._id}
                    style={{
                      padding: "4px 12px",
                      fontSize: "11px",
                      color: "var(--parchment-60)",
                      fontFamily: "var(--font-mono)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={asset.blobUrl}
                  >
                    🖼 {asset.filename}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Upload control */}
          {isEditor && (
            <div style={{ padding: "8px 12px", borderTop: "1px solid rgba(246, 242, 232, 0.08)", display: "flex", flexDirection: "column", gap: "4px" }}>
              <label
                style={{
                  display: "block",
                  padding: "5px 8px",
                  borderRadius: "4px",
                  border: "1px dashed rgba(246, 242, 232, 0.2)",
                  textAlign: "center",
                  fontSize: "11px",
                  color: "var(--parchment-60)",
                  cursor: "pointer",
                }}
              >
                Upload File / Assets
                <input type="file" style={{ display: "none" }} multiple onChange={handleFileUpload} />
              </label>
            </div>
          )}
        </div>

        {/* Center/Right Workspace Panes */}
        <div className="flex flex-1 overflow-hidden" style={{ position: "relative" }}>
          {/* Monaco Editor Pane (Ink Surface) */}
          <div
            className="flex flex-col h-full"
            style={{ width: `${editorWidthPercent}%`, background: "var(--ink)", overflow: "hidden" }}
          >
            {activeFile && (
              <MonacoEditor
                value={editorContent}
                onChange={handleEditorChange}
                filename={activeFile.filename}
                readOnly={!isEditor}
                compileLog={compileLog}
              />
            )}
          </div>

          {/* Stitched Seam Resizable Divider with Anchored Wax Seal */}
          <StitchedSeamDivider
            leftWidth={editorWidthPercent}
            onResize={(deltaOrPercent) => {
              if (typeof deltaOrPercent === "number") {
                setEditorWidthPercent(deltaOrPercent);
              }
            }}
            containerRef={containerRef}
          >
            <WaxSealButton
              onCompile={() => compile(editorContent, files)}
              status={compileStatus}
            />
          </StitchedSeamDivider>

          {/* PDF Preview Pane (Parchment Surface) */}
          <div className="flex flex-col flex-1 h-full overflow-hidden" style={{ background: "var(--parchment)" }}>
            <PdfPreview pdfBytes={pdfBytes} compileStatus={compileStatus} />

            {/* Error Log Panel in Marginalia Red */}
            {compileStatus === "error" && compileLog && (
              <div
                style={{
                  height: "180px",
                  background: "var(--red-tint)",
                  borderTop: "2px solid var(--marginalia-red)",
                  padding: "12px 16px",
                  overflowY: "auto",
                  color: "var(--marginalia-red)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                }}
                className="dark-scrollbar"
              >
                <div style={{ fontWeight: 600, marginBottom: "6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Compilation Error Log</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setCompileLog("")} style={{ color: "var(--marginalia-red)" }}>
                    ✕ Close
                  </button>
                </div>
                <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{compileLog}</pre>
              </div>
            )}
          </div>

          {/* History Panel Drawer */}
          {showHistory && (
            <HistoryDrawer
              projectId={id}
              files={files}
              onClose={() => setShowHistory(false)}
              onRestore={(updatedFiles) => {
                setFiles(updatedFiles);
                const main = updatedFiles.find((f) => f.isMainTex) || updatedFiles[0];
                if (main) {
                  setActiveFileId(main._id);
                  setEditorContent(main.content);
                }
                setShowHistory(false);
                toast.success("Restored to commit");
              }}
            />
          )}
        </div>
      </div>

      {/* New File Modal */}
      {showNewFile && (
        <div className="modal-overlay" onClick={() => setShowNewFile(false)}>
          <div className="modal-ink" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", fontFamily: "var(--font-serif)" }}>
              Create New File
            </div>
            <form onSubmit={createFile}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", color: "var(--parchment-60)", display: "block", marginBottom: "6px" }}>
                  Filename (e.g. section1.tex, references.bib)
                </label>
                <input
                  className="input-ink input-mono"
                  placeholder="chapter.tex"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-between">
                <button type="button" className="btn btn-secondary-ink flex-1" onClick={() => setShowNewFile(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1" disabled={!newFileName.trim()}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Commit Modal */}
      {showCommit && (
        <div className="modal-overlay" onClick={() => setShowCommit(false)}>
          <div className="modal-ink" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", fontFamily: "var(--font-serif)" }}>
              Create Version Commit
            </div>
            <form onSubmit={createCommit}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", color: "var(--parchment-60)", display: "block", marginBottom: "6px" }}>
                  Commit Message
                </label>
                <input
                  className="input-ink"
                  placeholder="Describe what changed in this version"
                  value={commitMsg}
                  onChange={(e) => setCommitMsg(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-between">
                <button type="button" className="btn btn-secondary-ink flex-1" onClick={() => setShowCommit(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1" disabled={committing}>
                  {committing ? "Saving…" : "Save Commit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShare && (
        <div className="modal-overlay" onClick={() => setShowShare(false)}>
          <div className="modal-parchment" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px", fontFamily: "var(--font-serif)" }}>
              Share Project
            </div>
            <p style={{ fontSize: "13px", color: "var(--ink-60)", marginBottom: "20px" }}>
              Generate an access code to grant access to collaborators.
            </p>

            {generatedCode ? (
              <div>
                <div style={{ fontSize: "12px", color: "var(--ink-60)", marginBottom: "6px" }}>
                  Active Access Code ({shareRole}):
                </div>
                <div className="code-reveal" style={{ marginBottom: "20px" }}>
                  {generatedCode}
                </div>
                <button
                  className="btn btn-primary w-full"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedCode);
                    toast.success("Access code copied to clipboard!");
                  }}
                >
                  Copy Code
                </button>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "8px" }}>
                    Select Access Role:
                  </label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      type="button"
                      className={`btn flex-1 ${shareRole === "editor" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setShareRole("editor")}
                    >
                      <IconEdit size={14} /> Editor
                    </button>
                    <button
                      type="button"
                      className={`btn flex-1 ${shareRole === "viewer" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setShareRole("viewer")}
                    >
                      <IconLock size={14} /> Viewer
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowShare(false)}>
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary flex-1"
                    onClick={handleGenerateCode}
                    disabled={generatingCode}
                  >
                    {generatingCode ? "Generating…" : "Generate Access Code"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── History Drawer Component ──────────────────────────────────────────────────
function HistoryDrawer({
  projectId,
  files,
  onClose,
  onRestore,
}: {
  projectId: string;
  files: FileDoc[];
  onClose: () => void;
  onRestore: (files: FileDoc[]) => void;
}) {
  const [commits, setCommits] = useState<{ _id: string; message: string; createdAt: string; authorId: { username: string } }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/commits`)
      .then((r) => r.json())
      .then((d) => setCommits(d.commits || []))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function restoreCommit(commitId: string) {
    if (!confirm("Restore project to this commit? Current unsaved work will be overwritten.")) return;
    const res = await fetch(`/api/commits/${commitId}/restore`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      const updated = await fetch(`/api/projects/${projectId}`).then((r) => r.json());
      if (updated.files) onRestore(updated.files);
    } else {
      toast.error(data.error);
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: "300px",
        background: "#15181E",
        borderLeft: "1px solid rgba(246, 242, 232, 0.12)",
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid rgba(246, 242, 232, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "var(--parchment)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, fontSize: "13px" }}>
          <IconHistory size={16} /> Version History
        </div>
        <button className="btn btn-ghost-ink btn-icon" onClick={onClose}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }} className="dark-scrollbar">
        {loading ? (
          <div className="flex justify-center" style={{ padding: "32px" }}><div className="spinner spinner-ink" /></div>
        ) : commits.length === 0 ? (
          <div style={{ padding: "24px", color: "var(--parchment-35)", fontSize: "12px", textAlign: "center" }}>
            No commits recorded yet.
          </div>
        ) : (
          commits.map((commit) => (
            <div
              key={commit._id}
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid rgba(246, 242, 232, 0.06)",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--parchment)" }}>
                {commit.message || "Snapshot"}
              </div>
              <div style={{ fontSize: "11px", color: "var(--parchment-35)" }}>
                {new Date(commit.createdAt).toLocaleString()} · {commit.authorId?.username}
              </div>
              <button
                className="btn btn-ghost-ink btn-sm"
                onClick={() => restoreCommit(commit._id)}
                style={{ alignSelf: "flex-start", marginTop: "4px", fontSize: "11px" }}
              >
                Restore
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

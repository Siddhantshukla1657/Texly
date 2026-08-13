"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

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
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showCommit, setShowCommit] = useState(false);
  const [commitMsg, setCommitMsg] = useState("");
  const [committing, setCommitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  const workerRef = useRef<Worker | null>(null);
  const compileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
          toast.error("You no longer have access to this project");
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
    fetch("/api/me/access").then((r) => r.json()).then((data) => {
      const grant = data.grants?.find(
        (g: { projectId: { _id: string }; role: string }) => g.projectId._id === id
      );
      if (grant) setIsEditor(grant.role === "editor");
      else if (data.isAdmin) setIsEditor(true);
    });
  }, [id]);

  // Debounced compile (1.5s after typing stops)
  const triggerCompile = useCallback(
    (content: string, allFiles?: FileDoc[]) => {
      if (compileTimer.current) clearTimeout(compileTimer.current);
      compileTimer.current = setTimeout(() => {
        compile(content, allFiles || files);
      }, 1500);
    },
    [files]
  );

  function compile(currentContent: string, allFiles: FileDoc[]) {
    if (!workerRef.current) return;
    setCompileStatus("compiling");

    const fileMap: Record<string, string> = {};
    for (const f of allFiles) {
      fileMap[f.filename] = f._id === activeFileId ? currentContent : f.content;
    }

    // Include assets as refs (the engine needs them by name)
    for (const a of assets) {
      fileMap[a.filename] = a.blobUrl; // actual content fetched by engine
    }

    const mainFile = allFiles.find((f) => f.isMainTex)?.filename || allFiles[0]?.filename;
    if (!mainFile) return;

    workerRef.current.postMessage({ type: "compile", files: fileMap, mainFile });
  }

  function handleEditorChange(value: string) {
    setEditorContent(value);

    // Debounced autosave
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("unsaved");
    saveTimer.current = setTimeout(() => {
      saveFile(activeFileId!, value);
    }, 800);

    // Debounced compile
    triggerCompile(value);
  }

  async function saveFile(fileId: string, content: string) {
    if (!isEditor) return;
    setSaveStatus("saving");
    setIsSaving(true);
    try {
      await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      setSaveStatus("saved");
      // Update local file state
      setFiles((prev) => prev.map((f) => (f._id === fileId ? { ...f, content } : f)));
    } catch {
      setSaveStatus("unsaved");
    } finally {
      setIsSaving(false);
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
      // Retain relative path if folder upload (webkitRelativePath)
      const relPath = file.webkitRelativePath || file.name;
      const sanitizedName = relPath.replace(/[^a-zA-Z0-9._\-/]/g, "_");

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (>10MB)`);
        continue;
      }

      // Check if image or asset
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
          setFiles((prev) => [...prev.filter(f => f.filename !== sanitizedName), data.file]);
          successCount++;
        }
      } else {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/projects/${id}/assets`, { method: "POST", body: formData });
        const data = await res.json();
        if (res.ok) {
          setAssets((prev) => [...prev.filter(a => a.filename !== sanitizedName), data.asset]);
          successCount++;
        }
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} file(s)`);
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

  // Manual compile shortcut Ctrl/Cmd+Enter
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (compileTimer.current) clearTimeout(compileTimer.current);
        compile(editorContent, files);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editorContent, files]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: "100vh", background: "var(--bg-editor)" }}
      >
        <div className="spinner" />
      </div>
    );
  }

  const statusDotClass =
    compileStatus === "success"
      ? "dot-green"
      : compileStatus === "error"
      ? "dot-red"
      : compileStatus === "compiling"
      ? "dot-yellow"
      : "dot-muted";

  return (
    <div className="editor-layout">
      {/* File Tree */}
      <div className="file-tree">
        {/* Header */}
        <div
          style={{
            padding: "10px 12px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <Link
            href="/"
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.3px",
              textDecoration: "none",
            }}
          >
            Tex<span style={{ color: "var(--primary)" }}>ly</span>
          </Link>
          <UserButton />
        </div>

        {/* Project name */}
        <div
          style={{
            padding: "8px 12px",
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--text-muted)",
            borderBottom: "1px solid var(--border)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={project?.name}
        >
          {project?.name}
        </div>

        {/* Files header */}
        <div
          style={{
            padding: "6px 12px 4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            Files
          </span>
          {isEditor && (
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setShowNewFile(true)}
              title="New file"
              style={{ fontSize: "14px", padding: "2px 4px" }}
            >
              +
            </button>
          )}
        </div>

        {/* File list */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {files.map((file) => (
            <div
              key={file._id}
              style={{ position: "relative", display: "flex", alignItems: "center" }}
            >
              <button
                className={`file-item${activeFileId === file._id ? " active" : ""}`}
                style={{ flex: 1 }}
                onClick={() => switchFile(file)}
              >
                <span style={{ fontSize: "12px" }}>{file.isMainTex ? "📄" : "📝"}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {file.filename}
                </span>
              </button>
              {isEditor && !file.isMainTex && (
                <button
                  style={{
                    position: "absolute",
                    right: "4px",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "12px",
                    padding: "2px 4px",
                    opacity: 0,
                    transition: "opacity var(--transition)",
                  }}
                  className="file-delete-btn"
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
          ))}

          {/* Assets */}
          {assets.length > 0 && (
            <>
              <div
                style={{
                  padding: "6px 12px 4px",
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  marginTop: "8px",
                }}
              >
                Assets
              </div>
              {assets.map((asset) => (
                <div
                  key={asset._id}
                  style={{
                    padding: "4px 12px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
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

        {/* Upload options */}
        {isEditor && (
          <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                display: "block",
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px dashed var(--border)",
                textAlign: "center",
                fontSize: "11px",
                color: "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              📁 Upload Folder
              <input
                type="file"
                style={{ display: "none" }}
                // @ts-expect-error webkitdirectory is standard in HTML5 browsers but missing in TS types
                webkitdirectory="true"
                directory=""
                multiple
                onChange={handleFileUpload}
              />
            </label>
            <label
              style={{
                display: "block",
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px dashed var(--border)",
                textAlign: "center",
                fontSize: "11px",
                color: "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              📄 Upload Files
              <input
                type="file"
                style={{ display: "none" }}
                multiple
                onChange={handleFileUpload}
              />
            </label>
          </div>
        )}
      </div>

      {/* Editor Main */}
      <div className="editor-main">
        {/* Toolbar */}
        <div className="editor-toolbar">
          {/* Compile status */}
          <div className={`dot ${statusDotClass}`} />
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {compileStatus === "compiling"
              ? "Compiling…"
              : compileStatus === "success"
              ? "Compiled"
              : compileStatus === "error"
              ? "Error"
              : "Ready"}
          </span>

          <div style={{ flex: 1 }} />

          {/* Save status */}
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            {saveStatus === "saving" ? "Saving…" : saveStatus === "unsaved" ? "Unsaved" : "Saved"}
          </span>

          <div
            style={{ width: "1px", height: "20px", background: "var(--border)" }}
          />

          {/* Compile button */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => compile(editorContent, files)}
            title="Compile (Ctrl+Enter)"
          >
            ▶ Compile
          </button>

          {/* Commit button */}
          {isEditor && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowCommit(true)}
            >
              Commit
            </button>
          )}

          {/* History toggle */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowHistory((s) => !s)}
            style={{ color: showHistory ? "var(--primary)" : undefined }}
          >
            History
          </button>
        </div>

        {/* Panes */}
        <div className="editor-panes">
          {/* Monaco */}
          <div className="editor-pane">
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

          {/* PDF Preview */}
          <div className="preview-pane">
            <PdfPreview pdfBytes={pdfBytes} compileStatus={compileStatus} />
          </div>

          {/* History panel */}
          {showHistory && (
            <HistoryPanel
              projectId={id}
              files={files}
              isEditor={isEditor}
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

        {/* Error panel */}
        {compileStatus === "error" && compileLog && (
          <div className="error-panel">
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{compileLog}</pre>
          </div>
        )}
      </div>

      {/* New file modal */}
      {showNewFile && (
        <div className="modal-overlay" onClick={() => setShowNewFile(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">New File</div>
            <form onSubmit={createFile}>
              <div style={{ marginBottom: "16px" }}>
                <label className="label">Filename</label>
                <input
                  className="input input-mono"
                  placeholder="chapter1.tex"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary flex-1"
                  onClick={() => setShowNewFile(false)}
                >
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

      {/* Commit modal */}
      {showCommit && (
        <div className="modal-overlay" onClick={() => setShowCommit(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Create Commit</div>
            <form onSubmit={createCommit}>
              <div style={{ marginBottom: "16px" }}>
                <label className="label">Commit message (optional)</label>
                <input
                  className="input"
                  placeholder="Snapshot — describe what changed"
                  value={commitMsg}
                  onChange={(e) => setCommitMsg(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary flex-1"
                  onClick={() => setShowCommit(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1" disabled={committing}>
                  {committing ? "Saving…" : "Commit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── History Panel Component ──────────────────────────────────────────────────
function HistoryPanel({
  projectId,
  files,
  isEditor,
  onRestore,
}: {
  projectId: string;
  files: FileDoc[];
  isEditor: boolean;
  onRestore: (files: FileDoc[]) => void;
}) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Commit[]>([]);
  const [diffView, setDiffView] = useState<DiffResult[] | null>(null);
  const [restoring, setRestoring] = useState(false);

  interface CommitFile { filename: string; content: string; fileId: string; }
  interface Commit { _id: string; message: string; createdAt: string; authorId: { username: string } }
  interface DiffResult { filename: string; lines: { type: "add" | "remove" | "ctx"; text: string }[] }[]

  useEffect(() => {
    fetch(`/api/projects/${projectId}/commits`)
      .then((r) => r.json())
      .then((d) => setCommits(d.commits || []))
      .finally(() => setLoading(false));
  }, [projectId]);

  function toggleSelect(commit: Commit) {
    if (selected.find((c) => c._id === commit._id)) {
      setSelected((prev) => prev.filter((c) => c._id !== commit._id));
      setDiffView(null);
    } else if (selected.length < 2) {
      setSelected((prev) => [...prev, commit]);
    }
  }

  async function computeDiff() {
    if (selected.length !== 2) return;
    const [a, b] = await Promise.all(
      selected.map((c) => fetch(`/api/commits/${c._id}`).then((r) => r.json()))
    );
    const commitA = a.commit;
    const commitB = b.commit;

    const allFilenames = new Set([
      ...commitA.files.map((f: CommitFile) => f.filename),
      ...commitB.files.map((f: CommitFile) => f.filename),
    ]);

    const diffs: DiffResult[] = [];
    for (const filename of allFilenames) {
      const fileA = commitA.files.find((f: CommitFile) => f.filename === filename)?.content || "";
      const fileB = commitB.files.find((f: CommitFile) => f.filename === filename)?.content || "";
      if (fileA === fileB) continue;

      const linesA = fileA.split("\n");
      const linesB = fileB.split("\n");
      const lines: { type: "add" | "remove" | "ctx"; text: string }[] = [];

      // Simple line diff
      const maxLen = Math.max(linesA.length, linesB.length);
      for (let i = 0; i < maxLen; i++) {
        if (i >= linesA.length) {
          lines.push({ type: "add", text: "+ " + linesB[i] });
        } else if (i >= linesB.length) {
          lines.push({ type: "remove", text: "- " + linesA[i] });
        } else if (linesA[i] !== linesB[i]) {
          lines.push({ type: "remove", text: "- " + linesA[i] });
          lines.push({ type: "add", text: "+ " + linesB[i] });
        } else {
          lines.push({ type: "ctx", text: "  " + linesA[i] });
        }
      }

      diffs.push({ filename, lines });
    }

    setDiffView(diffs);
  }

  async function restoreCommit(commitId: string) {
    if (!confirm("Restore to this commit? Current files will be overwritten (a new commit will be created).")) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/commits/${commitId}/restore`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        // Re-fetch files
        const filesRes = await fetch(`/api/projects/${projectId}/files`);
        const filesData = await filesRes.json();
        onRestore(filesData.files || []);
      } else {
        toast.error(data.error);
      }
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="history-panel">
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "13px" }}>History</span>
        {selected.length === 2 && (
          <button className="btn btn-secondary btn-sm" onClick={computeDiff}>
            Diff
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center" style={{ padding: "32px" }}>
          <div className="spinner" />
        </div>
      ) : commits.length === 0 ? (
        <div className="empty-state" style={{ padding: "32px" }}>
          <div className="empty-state-icon">📸</div>
          <div className="empty-state-text">No commits yet</div>
        </div>
      ) : (
        <div style={{ overflowY: "auto", flex: 1 }}>
          {diffView && (
            <div
              style={{
                padding: "12px",
                borderBottom: "1px solid var(--border)",
                maxHeight: "300px",
                overflowY: "auto",
              }}
            >
              {diffView.map((file: { filename: string; lines: { type: string; text: string }[] }) => (
                <div key={file.filename} style={{ marginBottom: "12px" }}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      marginBottom: "4px",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {file.filename}
                  </div>
                  {file.lines.map((line: { type: string; text: string }, i: number) => (
                    <div
                      key={i}
                      className={`diff-line ${
                        line.type === "add"
                          ? "diff-add"
                          : line.type === "remove"
                          ? "diff-remove"
                          : "diff-ctx"
                      }`}
                    >
                      {line.text}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {commits.map((commit: { _id: string; message: string; createdAt: string; authorId?: { username: string } }) => (
            <div
              key={commit._id}
              className={`commit-item${selected.find((c) => c._id === commit._id) ? " selected" : ""}`}
              onClick={() => toggleSelect(commit as Commit)}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  marginBottom: "2px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {commit.message}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {new Date(commit.createdAt).toLocaleString()} ·{" "}
                {(commit.authorId as { username: string })?.username || "unknown"}
              </div>
              {isEditor && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: "6px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    restoreCommit(commit._id);
                  }}
                  disabled={restoring}
                >
                  Restore
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

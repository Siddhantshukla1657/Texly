"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import {
  IconDocument,
  IconFolder,
  IconFolderOpen,
  IconFolderPlus,
  IconFilePlus,
  IconUpload,
  IconFolderUpload,
  IconHistory,
  IconKey,
  IconEdit,
  IconLock,
  IconBib,
  IconStyle,
  IconImage,
  IconClose,
  IconChevronDown,
  IconChevronRight,
  IconPlay,
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

const IMAGE_ASSET_EXTENSIONS = new Set(["png", "jpg", "jpeg", "svg"]);

function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

function isPreviewableImage(filename: string): boolean {
  return IMAGE_ASSET_EXTENSIONS.has(getFileExtension(filename));
}

interface Project {
  _id: string;
  name: string;
}

type CompileStatus = "idle" | "compiling" | "success" | "error";

// ─── Tree Node Types & Helper ──────────────────────────────────────────────────
interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  fileDoc?: FileDoc;
  assetDoc?: Asset;
}

function buildFileTree(files: FileDoc[], assets: Asset[]): TreeNode[] {
  const root: TreeNode[] = [];

  const findOrCreateFolder = (parentList: TreeNode[], folderName: string, folderPath: string): TreeNode => {
    let folder = parentList.find((node) => node.isFolder && node.name === folderName);
    if (!folder) {
      folder = {
        name: folderName,
        path: folderPath,
        isFolder: true,
        children: [],
      };
      parentList.push(folder);
    }
    return folder;
  };

  // Process text files
  files.forEach((file) => {
    const parts = file.filename.split("/").filter(Boolean);
    let currentLevel = root;
    let currentPath = "";

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const folderNode = findOrCreateFolder(currentLevel, part, currentPath);
      currentLevel = folderNode.children;
    }

    const fileName = parts[parts.length - 1] || file.filename;
    currentLevel.push({
      name: fileName,
      path: file.filename,
      isFolder: false,
      children: [],
      fileDoc: file,
    });
  });

  // Process binary assets
  assets.forEach((asset) => {
    const parts = asset.filename.split("/").filter(Boolean);
    let currentLevel = root;
    let currentPath = "";

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const folderNode = findOrCreateFolder(currentLevel, part, currentPath);
      currentLevel = folderNode.children;
    }

    const fileName = parts[parts.length - 1] || asset.filename;
    const existing = currentLevel.find((node) => !node.isFolder && node.name === fileName);
    if (existing) {
      existing.assetDoc = asset;
    } else {
      currentLevel.push({
        name: fileName,
        path: asset.filename,
        isFolder: false,
        children: [],
        assetDoc: asset,
      });
    }
  });

  // Sort folders first, then files alphabetically
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((node) => {
      if (node.isFolder) sortNodes(node.children);
    });
  };

  sortNodes(root);
  return root;
}

// ─── Main Editor Component ─────────────────────────────────────────────────────
export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileDoc[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [compileLog, setCompileLog] = useState("");
  const [compileStatus, setCompileStatus] = useState<CompileStatus>("idle");
  const [isEditor, setIsEditor] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [targetFolderPath, setTargetFolderPath] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
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
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const hasCompiledOnLoad = useRef(false);

  const activeFile = files.find((f) => f._id === activeFileId);
  const activeAsset = assets.find((a) => a._id === activeAssetId);
  const fileTree = useMemo(() => buildFileTree(files, assets), [files, assets]);

  // Init WebWorker
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
          setActiveAssetId(null);
          setEditorContent(mainFile.content);
        }
        setLoading(false);
      });
  }, [id, router]);

  // Check user role
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

  // Compile LaTeX
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

      const mainFile =
        allFiles.find((f) => f.isMainTex)?.filename ||
        allFiles.find(
          (f) => f.filename.toLowerCase() === "main.tex" || f.filename.toLowerCase().endsWith("/main.tex")
        )?.filename ||
        allFiles.find((f) => f.content.includes("\\documentclass"))?.filename ||
        allFiles[0]?.filename;
      if (!mainFile) return;

      workerRef.current.postMessage({ type: "compile", files: fileMap, mainFile });
    },
    [activeFileId, assets]
  );

  const compileCurrentProject = useCallback(() => {
    const currentContent =
      activeFileId && activeFile
        ? editorContent
        : files.find((f) => f.isMainTex)?.content || files[0]?.content || "";

    compile(currentContent, files);
  }, [activeFileId, activeFile, editorContent, files, compile]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        compileCurrentProject();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [compileCurrentProject]);

  // Auto-compile by default once project loads
  useEffect(() => {
    if (!loading && files.length > 0 && !hasCompiledOnLoad.current && workerRef.current) {
      hasCompiledOnLoad.current = true;
      const mainContent = files.find((f) => f.isMainTex)?.content || files[0]?.content || "";
      compile(mainContent, files);
    }
  }, [loading, files, compile]);

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
    setActiveAssetId(null);
    setEditorContent(file.content);
    setSaveStatus("saved");
  }

  function switchAsset(asset: Asset) {
    setActiveAssetId(asset._id);
    setActiveFileId(null);
    setEditorContent("");
    setSaveStatus("saved");
  }

  async function createFile(e: React.FormEvent) {
    e.preventDefault();
    let fullPath = newFileName.trim();
    if (targetFolderPath && !fullPath.startsWith(targetFolderPath + "/")) {
      fullPath = `${targetFolderPath}/${fullPath}`;
    }

    const res = await fetch(`/api/projects/${id}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: fullPath }),
    });
    const data = await res.json();
    if (res.ok) {
      setFiles((prev) => [...prev, data.file]);
      setShowNewFile(false);
      setNewFileName("");
      setTargetFolderPath("");
      switchFile(data.file);
      toast.success(`Created file ${data.file.filename}`);
    } else {
      toast.error(data.error);
    }
  }

  async function createFolder(e: React.FormEvent) {
    e.preventDefault();
    let folderPath = newFolderName.trim().replace(/[^a-zA-Z0-9._\-/]/g, "_");
    if (!folderPath) return;

    if (targetFolderPath && !folderPath.startsWith(targetFolderPath + "/")) {
      folderPath = `${targetFolderPath}/${folderPath}`;
    }

    // Initialize folder with a default TeX file
    const placeholderFile = `${folderPath}/section.tex`;
    const res = await fetch(`/api/projects/${id}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: placeholderFile, content: `% ${folderPath} section\n` }),
    });
    const data = await res.json();
    if (res.ok) {
      setFiles((prev) => [...prev, data.file]);
      setShowNewFolder(false);
      setNewFolderName("");
      setTargetFolderPath("");
      toast.success(`Created folder "${folderPath}"`);
      setExpandedFolders((prev) => ({ ...prev, [folderPath]: true }));
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

  // Helper for safe JSON parsing from API responses
  async function parseJsonResponse(res: Response) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { error: `Upload request failed (${res.status} ${res.statusText || ""})`.trim() };
    }
  }

  // Upload handler for files or entire folders
  async function processUpload(uploadedFiles: File[]) {
    if (uploadedFiles.length === 0) return;
    let successCount = 0;
    const uploadedFileDocs: FileDoc[] = [];

    for (const file of uploadedFiles) {
      let relPath = file.webkitRelativePath || file.name;
      const parts = relPath.split("/");
      if (parts.length > 1 && file.webkitRelativePath) {
        relPath = parts.slice(1).join("/");
      }
      if (!relPath) relPath = file.name;

      const sanitizedPath = relPath.replace(/[^a-zA-Z0-9._\-/]/g, "_");

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (>10MB)`);
        continue;
      }

      const isTexOrCode = /\.(tex|bib|sty|cls|txt|md|cfg|bst|def|clo)$/i.test(file.name);
      const isImageAsset = isPreviewableImage(sanitizedPath);

      try {
        if (isTexOrCode && !isImageAsset) {
          const textContent = await file.text();
          const lower = sanitizedPath.toLowerCase();
          const isMain =
            lower === "main.tex" || lower.endsWith("/main.tex") || textContent.includes("\\documentclass");

          const res = await fetch(`/api/projects/${id}/files`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: sanitizedPath, content: textContent, isMainTex: isMain }),
          });
          const data = await parseJsonResponse(res);
          if (res.ok && data.file) {
            uploadedFileDocs.push(data.file);
            setFiles((prev) => {
              const list = prev.filter((f) => f.filename !== sanitizedPath);
              if (isMain) {
                return [...list.map((f) => ({ ...f, isMainTex: false })), data.file];
              }
              return [...list, data.file];
            });
            successCount++;
          } else {
            toast.error(data.error || `Failed to upload ${file.name}`);
          }
        } else {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("filename", sanitizedPath);
          const res = await fetch(`/api/projects/${id}/assets`, { method: "POST", body: formData });
          const data = await parseJsonResponse(res);
          if (res.ok && data.asset) {
            setAssets((prev) => [...prev.filter((a) => a.filename !== sanitizedPath), data.asset]);
            successCount++;
          } else {
            toast.error(data.error || `Failed to upload asset ${file.name}`);
          }
        }
      } catch (err) {
        toast.error(`Error uploading ${file.name}`);
        console.error("Upload error:", err);
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} file(s)`);

      if (uploadedFileDocs.length > 0) {
        const mainUploaded = uploadedFileDocs.find((f) => f.isMainTex) || uploadedFileDocs[0];
        if (mainUploaded) {
          setActiveFileId(mainUploaded._id);
          setActiveAssetId(null);
          setEditorContent(mainUploaded.content);
        }
        setFiles((currentFiles) => {
          compile(mainUploaded ? mainUploaded.content : currentFiles[0]?.content || "", currentFiles);
          return currentFiles;
        });
      }
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

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

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
    <div
      className="flex flex-col w-full h-screen"
      style={{
        height: "100vh",
        maxHeight: "100vh",
        width: "100%",
        minHeight: 0,
        overflow: "hidden",
        background: "var(--ink)",
      }}
    >
      {/* ── Top Navbar Header ── */}
      <div
        style={{
          height: "46px",
          flexShrink: 0,
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
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            compileCurrentProject();
          }}
          disabled={compileStatus === "compiling"}
          style={{
            background: compileStatus === "compiling" ? "#D97706" : "var(--wax-amber, #E08214)",
            color: "#FFFFFF",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 12px",
            borderRadius: "5px",
            border: "none",
            cursor: compileStatus === "compiling" ? "not-allowed" : "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
          title="Compile LaTeX project to PDF"
        >
          {compileStatus === "compiling" ? (
            <>
              <span className="spinner" style={{ width: "12px", height: "12px", borderWidth: "2px" }} />
              Compiling…
            </>
          ) : (
            <>
              <IconPlay size={12} />
              Compile
            </>
          )}
        </button>

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

      {/* ── Main Workspace split ── */}
      <div className="flex flex-1 overflow-hidden" ref={containerRef} style={{ minWidth: 0, minHeight: 0, height: "calc(100% - 46px)" }}>
        {/* ── File & Folder Tree Sidebar ── */}
        <div
          style={{
            width: "240px",
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
              Files & Folders
            </div>
            {isEditor && (
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  className="btn btn-ghost-ink btn-icon"
                  onClick={() => {
                    setTargetFolderPath("");
                    setShowNewFolder(true);
                  }}
                  title="New Folder"
                  style={{ padding: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <IconFolderPlus size={14} />
                </button>
                <button
                  className="btn btn-ghost-ink btn-icon"
                  onClick={() => {
                    setTargetFolderPath("");
                    setShowNewFile(true);
                  }}
                  title="New File"
                  style={{ padding: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <IconFilePlus size={14} />
                </button>
              </div>
            )}
          </div>

          {/* File & Folder Nested Tree List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }} className="dark-scrollbar">
            {fileTree.map((node) => (
              <TreeNodeItem
                key={node.path}
                node={node}
                depth={0}
                activeFileId={activeFileId}
                activeAssetId={activeAssetId}
                expandedFolders={expandedFolders}
                onToggleFolder={toggleFolder}
                onSelectFile={switchFile}
                onSelectAsset={switchAsset}
                onDeleteFile={deleteFile}
                onAddFileToFolder={(folderPath) => {
                  setTargetFolderPath(folderPath);
                  setShowNewFile(true);
                }}
                isEditor={isEditor}
              />
            ))}
          </div>

          {/* Upload File and Folder Actions */}
          {isEditor && (
            <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(246, 242, 232, 0.12)", background: "#11141A", display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                multiple
                accept=".tex,.bib,.sty,.cls,.txt,.md,.cfg,.bst,.def,.clo,.png,.jpg,.jpeg,.svg"
                onChange={(e) => processUpload(Array.from(e.target.files || []))}
              />
              <input
                ref={folderInputRef}
                type="file"
                style={{ display: "none" }}
                // @ts-ignore
                webkitdirectory=""
                directory=""
                multiple
                onChange={(e) => processUpload(Array.from(e.target.files || []))}
              />

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    background: "rgba(246, 242, 232, 0.07)",
                    border: "1px solid rgba(246, 242, 232, 0.15)",
                    borderRadius: "5px",
                    color: "var(--parchment)",
                    fontSize: "12px",
                    fontWeight: 500,
                    padding: "6px 8px",
                    cursor: "pointer",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                  title="Upload individual files"
                >
                  <IconUpload size={13} />
                  <span>Upload Files</span>
                </button>
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    background: "rgba(246, 242, 232, 0.07)",
                    border: "1px solid rgba(246, 242, 232, 0.15)",
                    borderRadius: "5px",
                    color: "var(--parchment)",
                    fontSize: "12px",
                    fontWeight: 500,
                    padding: "6px 8px",
                    cursor: "pointer",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                  title="Upload an entire folder"
                >
                  <IconFolderUpload size={13} />
                  <span>Upload Folder</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Center/Right Workspace Panes ── */}
        <div className="flex flex-1 overflow-hidden" style={{ position: "relative", minWidth: 0, minHeight: 0, height: "100%" }}>
          {/* Monaco Editor Pane */}
          <div
            className="flex flex-col h-full"
            style={{ width: `${editorWidthPercent}%`, minWidth: 0, flexShrink: 0, background: "var(--ink)", overflow: "hidden", minHeight: 0, height: "100%" }}
          >
            {activeFile && (
              <MonacoEditor
                key={activeFile._id}
                value={editorContent}
                onChange={handleEditorChange}
                filename={activeFile.filename}
                readOnly={!isEditor}
                compileLog={compileLog}
              />
            )}
            {activeAsset && <AssetPreview asset={activeAsset} />}
          </div>

          {/* Stitched Seam Resizable Divider */}
          <StitchedSeamDivider
            leftWidth={editorWidthPercent}
            onResize={(deltaOrPercent) => {
              if (typeof deltaOrPercent === "number") {
                setEditorWidthPercent(deltaOrPercent);
              }
            }}
            containerRef={containerRef}
          />

          {/* PDF Preview Pane */}
          <div className="flex flex-col flex-1 h-full overflow-hidden" style={{ background: "var(--parchment)", minWidth: 0, minHeight: 0, height: "100%" }}>
            <PdfPreview pdfBytes={pdfBytes} compileStatus={compileStatus} />

            {/* Error Log Panel */}
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
                  <button className="btn btn-ghost btn-sm" onClick={() => setCompileLog("")} style={{ color: "var(--marginalia-red)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <IconClose size={12} /> Close
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
                  setActiveAssetId(null);
                  setEditorContent(main.content);
                }
                setShowHistory(false);
                toast.success("Restored to commit");
              }}
            />
          )}
        </div>
      </div>

      {/* ── New File Modal ── */}
      {showNewFile && (
        <div className="modal-overlay" onClick={() => setShowNewFile(false)}>
          <div className="modal-ink" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", fontFamily: "var(--font-serif)" }}>
              Create New File {targetFolderPath ? `in /${targetFolderPath}` : ""}
            </div>
            <form onSubmit={createFile}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", color: "var(--parchment-60)", display: "block", marginBottom: "6px" }}>
                  Filename or path (e.g. section1.tex, chapters/intro.tex)
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
                  Create File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── New Folder Modal ── */}
      {showNewFolder && (
        <div className="modal-overlay" onClick={() => setShowNewFolder(false)}>
          <div className="modal-ink" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", fontFamily: "var(--font-serif)" }}>
              Create New Folder {targetFolderPath ? `in /${targetFolderPath}` : ""}
            </div>
            <form onSubmit={createFolder}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", color: "var(--parchment-60)", display: "block", marginBottom: "6px" }}>
                  Folder Name (e.g. chapters, figures, sections)
                </label>
                <input
                  className="input-ink input-mono"
                  placeholder="chapters"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-between">
                <button type="button" className="btn btn-secondary-ink flex-1" onClick={() => setShowNewFolder(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1" disabled={!newFolderName.trim()}>
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Commit Modal ── */}
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

      {/* ── Share Modal ── */}
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

function AssetPreview({ asset }: { asset: Asset }) {
  const canPreview = isPreviewableImage(asset.filename);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--ink)", color: "var(--parchment)", minHeight: 0 }}>
      <div
        style={{
          height: "36px",
          flexShrink: 0,
          borderBottom: "1px solid rgba(246, 242, 232, 0.1)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "0 12px",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          color: "var(--parchment-60)",
        }}
      >
        <IconImage size={14} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.filename}</span>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
        className="dark-scrollbar"
      >
        {canPreview ? (
          <img
            src={asset.blobUrl}
            alt={asset.filename}
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              background: "#fff",
              border: "1px solid rgba(246, 242, 232, 0.14)",
            }}
          />
        ) : (
          <div
            style={{
              border: "1px solid rgba(246, 242, 232, 0.14)",
              borderRadius: "6px",
              padding: "18px",
              color: "var(--parchment-60)",
              fontSize: "13px",
              textAlign: "center",
            }}
          >
            Preview is available for PNG, JPG, JPEG, and SVG images.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Recursive Tree Node Item View ──────────────────────────────────────────────
function TreeNodeItem({
  node,
  depth,
  activeFileId,
  activeAssetId,
  expandedFolders,
  onToggleFolder,
  onSelectFile,
  onSelectAsset,
  onDeleteFile,
  onAddFileToFolder,
  isEditor,
}: {
  node: TreeNode;
  depth: number;
  activeFileId: string | null;
  activeAssetId: string | null;
  expandedFolders: Record<string, boolean>;
  onToggleFolder: (path: string) => void;
  onSelectFile: (file: FileDoc) => void;
  onSelectAsset: (asset: Asset) => void;
  onDeleteFile: (fileId: string) => void;
  onAddFileToFolder: (folderPath: string) => void;
  isEditor: boolean;
}) {
  const isExpanded = expandedFolders[node.path] !== false; // expanded by default

  if (node.isFolder) {
    return (
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "5px 10px",
            paddingLeft: `${10 + depth * 14}px`,
            cursor: "pointer",
            color: "var(--parchment-60)",
            fontSize: "12px",
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            userSelect: "none",
            gap: "6px",
          }}
          onClick={() => onToggleFolder(node.path)}
        >
          <span style={{ width: "12px", color: "var(--parchment-35)", display: "flex", alignItems: "center" }}>
            {isExpanded ? <IconChevronDown size={10} strokeWidth={2.5} /> : <IconChevronRight size={10} strokeWidth={2.5} />}
          </span>
          <span style={{ display: "flex", alignItems: "center", color: "var(--parchment-60)" }}>{isExpanded ? <IconFolderOpen size={13} /> : <IconFolder size={13} />}</span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {node.name}
          </span>
          <span style={{ fontSize: "10px", color: "var(--parchment-35)", fontFamily: "var(--font-mono)" }}>
            {node.children.length}
          </span>
          {isEditor && (
            <button
              style={{
                background: "none",
                border: "none",
                color: "var(--parchment-60)",
                cursor: "pointer",
                fontSize: "12px",
                padding: "0 4px",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onAddFileToFolder(node.path);
              }}
              title={`Add file to ${node.name}`}
            >
              +
            </button>
          )}
        </div>

        {isExpanded && (
          <div>
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                activeFileId={activeFileId}
                activeAssetId={activeAssetId}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                onSelectFile={onSelectFile}
                onSelectAsset={onSelectAsset}
                onDeleteFile={onDeleteFile}
                onAddFileToFolder={onAddFileToFolder}
                isEditor={isEditor}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File or Asset item
  const file = node.fileDoc;
  const asset = node.assetDoc;
  const isActive = file && activeFileId === file._id;
  const isAssetActive = asset && activeAssetId === asset._id;

  const ext = getFileExtension(node.name);
  const IconFileType = ext === "bib" ? IconBib : ext === "sty" || ext === "cls" ? IconStyle : asset && isPreviewableImage(node.name) ? IconImage : IconDocument;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "5px 10px",
        paddingLeft: `${14 + depth * 14}px`,
        cursor: file || asset ? "pointer" : "default",
        background: isActive || isAssetActive ? "rgba(246, 242, 232, 0.08)" : "transparent",
        borderLeft: isActive || isAssetActive ? "2px solid var(--verdigris)" : "2px solid transparent",
        color: isActive || isAssetActive ? "var(--parchment)" : "var(--parchment-60)",
        fontSize: "12px",
        fontFamily: "var(--font-mono)",
        gap: "6px",
      }}
      onClick={() => {
        if (file) onSelectFile(file);
        else if (asset) onSelectAsset(asset);
      }}
    >
      <span style={{ display: "flex", alignItems: "center", color: "var(--parchment-35)" }}><IconFileType size={13} /></span>
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {node.name}
      </span>
      {isEditor && file && !file.isMainTex && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteFile(file._id);
          }}
          title="Delete file"
          style={{
            background: "none",
            border: "none",
            color: "var(--parchment-35)",
            cursor: "pointer",
            fontSize: "11px",
            padding: "0 2px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <IconClose size={11} />
        </button>
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
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
        color: "var(--parchment)",
      }}
    >
      <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(246, 242, 232, 0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: "16px", fontWeight: 600 }}>
          Version History
        </div>
        <button className="btn btn-ghost-ink btn-icon" onClick={onClose} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><IconClose size={14} /></button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }} className="dark-scrollbar">
        {loading ? (
          <div className="flex justify-center" style={{ padding: "24px" }}><div className="spinner spinner-ink" /></div>
        ) : commits.length === 0 ? (
          <div style={{ fontSize: "13px", color: "var(--parchment-60)", textAlign: "center", paddingTop: "32px" }}>
            No commits created yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {commits.map((c) => (
              <div
                key={c._id}
                style={{
                  padding: "12px",
                  background: "rgba(246, 242, 232, 0.04)",
                  border: "1px solid rgba(246, 242, 232, 0.08)",
                  borderRadius: "6px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "13px" }}>{c.message}</div>
                <div style={{ fontSize: "11px", color: "var(--parchment-35)", display: "flex", justifyContent: "space-between" }}>
                  <span>{c.authorId?.username || "Unknown"}</span>
                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
                <button
                  className="btn btn-secondary-ink btn-sm"
                  style={{ marginTop: "4px", fontSize: "11px" }}
                  onClick={() => restoreCommit(c._id)}
                >
                  Restore Version
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

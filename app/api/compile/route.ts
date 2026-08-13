import { NextRequest, NextResponse } from "next/server";

// ─── Path Utilities ────────────────────────────────────────────────────────────

function normalizePath(path: string): string {
  return path.replace(/^\.\//, "").trim();
}

function getDir(filePath: string): string {
  const norm = normalizePath(filePath);
  const lastSlash = norm.lastIndexOf("/");
  return lastSlash !== -1 ? norm.slice(0, lastSlash + 1) : "";
}

// ─── LaTeX Import Resolver ─────────────────────────────────────────────────────
// Recursively inlines all \input{} and \include{} directives from filesMap.
// Handles any directory structure (e.g. sections/abstract.tex, ./sections/intro, etc.)
function resolveLatexImports(
  filename: string,
  filesMap: Record<string, string>,
  visited = new Set<string>()
): string {
  const normalizedFilename = normalizePath(filename);

  if (visited.has(normalizedFilename)) {
    return `\n% [Texly] Circular reference skipped: ${normalizedFilename}\n`;
  }
  visited.add(normalizedFilename);

  let rawContent = filesMap[normalizedFilename];
  if (rawContent === undefined) {
    // Try matching with or without .tex extension
    const matchedKey = Object.keys(filesMap).find((k) => {
      const normK = normalizePath(k);
      if (normK === normalizedFilename) return true;
      if (normalizedFilename.endsWith(".tex") && normK === normalizedFilename.slice(0, -4)) return true;
      if (!normalizedFilename.endsWith(".tex") && normK === `${normalizedFilename}.tex`) return true;
      return false;
    });
    if (matchedKey !== undefined) {
      rawContent = filesMap[matchedKey];
    }
  }

  if (rawContent === undefined) {
    return "";
  }

  const currentDir = getDir(normalizedFilename);
  const lines = rawContent.split("\n");

  const processedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("%")) return line;

    let codePart = line;
    let commentPart = "";
    const commentIndex = line.search(/(?<!\\)%/);
    if (commentIndex !== -1) {
      codePart = line.slice(0, commentIndex);
      commentPart = line.slice(commentIndex);
    }

    // Match \input{path}, \include{path}, \input path
    const importRegex = /\\(input|include)\s*(?:\{([^}]+)\}|([^\s%#{}\\]+))/g;
    const replacedCode = codePart.replace(importRegex, (match, _cmd, path1, path2) => {
      const targetPath = normalizePath(path1 || path2 || "");
      if (!targetPath) return match;

      const candidates = [
        currentDir + targetPath,
        currentDir + (targetPath.endsWith(".tex") ? targetPath : `${targetPath}.tex`),
        targetPath,
        targetPath.endsWith(".tex") ? targetPath : `${targetPath}.tex`,
        targetPath.endsWith(".tex") ? targetPath.slice(0, -4) : targetPath,
      ];

      const foundKey = Object.keys(filesMap).find((k) => {
        const normK = normalizePath(k);
        return candidates.some((c) => normalizePath(c) === normK);
      });

      if (foundKey !== undefined) {
        return resolveLatexImports(foundKey, filesMap, new Set(visited));
      }

      return match;
    });

    return replacedCode + commentPart;
  });

  return processedLines.join("\n");
}

// ─── Main Entry Finder ─────────────────────────────────────────────────────────

function findMainLatexFile(mainFileParam: string, filesMap: Record<string, string>): string {
  const normMainParam = normalizePath(mainFileParam || "");
  const keys = Object.keys(filesMap);
  if (keys.length === 0) return "";

  const hasDocClass = (k: string) => (filesMap[k] || "").includes("\\documentclass");
  const isMainFilename = (k: string) => {
    const normK = normalizePath(k).toLowerCase();
    return normK === "main.tex" || normK.endsWith("/main.tex");
  };

  if (normMainParam && filesMap[normMainParam] !== undefined && hasDocClass(normMainParam)) {
    return normMainParam;
  }
  const mainWithClass = keys.find((k) => isMainFilename(k) && hasDocClass(k));
  if (mainWithClass) return normalizePath(mainWithClass);

  const anyWithClass = keys.find((k) => hasDocClass(k));
  if (anyWithClass) return normalizePath(anyWithClass);

  const anyMain = keys.find((k) => isMainFilename(k));
  if (anyMain) return normalizePath(anyMain);

  const anyTex = keys.find((k) => normalizePath(k).toLowerCase().endsWith(".tex"));
  if (anyTex) return normalizePath(anyTex);

  return normalizePath(keys[0]);
}

// ─── Ytotech / TeXLive Compilers ───────────────────────────────────────────────

interface CompileAsset {
  filename: string;
  bytes: Uint8Array;
  type: string;
}

const PDFLATEX_GRAPHICS_EXTENSIONS = new Set(["png", "jpg", "jpeg", "pdf"]);

function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

function getBaseName(filename: string): string {
  return normalizePath(filename).split("/").pop() || filename;
}

function isAssetReference(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:");
}

function findAssetForGraphicsPath(targetPath: string, assetNames: string[]): string | null {
  const normalizedTarget = normalizePath(targetPath);
  const targetBase = getBaseName(normalizedTarget);

  return assetNames.find((assetName) => {
    const normalizedAsset = normalizePath(assetName);
    const assetBase = getBaseName(normalizedAsset);

    if (normalizedTarget === normalizedAsset || normalizedTarget === assetBase || targetBase === assetBase) {
      return true;
    }

    if (!getFileExtension(normalizedTarget)) {
      const targetWithExt = `${normalizedTarget}.${getFileExtension(assetBase)}`;
      return targetWithExt === normalizedAsset || targetWithExt === assetBase;
    }

    return false;
  }) || null;
}

function rewriteIncludeGraphicsPaths(text: string, assetNames: string[]): string {
  if (assetNames.length === 0) return text;

  return text.replace(/(\\includegraphics(?:\s*\[[^\]]*\])*\s*\{)([^}]+)(\})/g, (match, prefix, targetPath, suffix) => {
    const assetName = findAssetForGraphicsPath(targetPath, assetNames);
    if (!assetName) return match;
    return `${prefix}${assetName}${suffix}`;
  });
}

function findReferencedSvgAsset(text: string, assetNames: string[]): string | null {
  const matches = text.matchAll(/\\includegraphics(?:\s*\[[^\]]*\])*\s*\{([^}]+)\}/g);
  for (const match of matches) {
    const targetPath = match[1] || "";
    const assetName = findAssetForGraphicsPath(targetPath, assetNames);
    const ext = getFileExtension(assetName || targetPath);
    if (ext === "svg") return assetName || targetPath;
  }
  return null;
}

// Only require xelatex for features that genuinely need it.
function shouldPreferXeLaTeX(text: string): boolean {
  const xelatexSpecificPackages = [
    "fontspec", "xunicode", "xeCJK", "polyglossia", "unicode-math",
    "xltxtra", "realscripts", "metalogo",
  ];
  const xelatexSpecificCommands = [
    "\\setmainfont", "\\setsansfont", "\\setmonofont",
    "\\setmathfont", "\\newfontfamily", "\\addfontfeature",
  ];
  for (const pkg of xelatexSpecificPackages) {
    if (text.includes(`{${pkg}}`)) return true;
  }
  for (const cmd of xelatexSpecificCommands) {
    if (text.includes(cmd)) return true;
  }
  if (text.includes("%!TEX program = xelatex") || text.includes("%!TeX program=xelatex")) return true;
  return false;
}

// PNG magic bytes: 137 80 78 71 13 10 26 10
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function validateAssetBytes(filename: string, bytes: Uint8Array): void {
  const ext = getFileExtension(filename);
  if (ext === "png" || ext === "jpg" || ext === "jpeg") {
    const header = Array.from(bytes.slice(0, 16)).map((b) => b.toString(16).padStart(2, "0")).join(" ");
    const isPng = ext === "png" && PNG_MAGIC.every((b, i) => bytes[i] === b);
    const isJpeg = (ext === "jpg" || ext === "jpeg") && bytes[0] === 0xff && bytes[1] === 0xd8;
    const valid = ext === "png" ? isPng : isJpeg;
    console.log(`[compile] asset "${filename}": ${bytes.length} bytes, header=[${header}], valid=${valid}`);
    if (!valid) {
      console.error(`[compile] ⚠️ CORRUPTED asset "${filename}"! Header does not match expected magic bytes.`);
    }
  }
}

async function loadCompileAsset(filename: string, source: string): Promise<CompileAsset | null> {
  try {
    if (source.startsWith("data:")) {
      const commaIdx = source.indexOf(",");
      if (commaIdx === -1) return null;

      const meta = source.slice(0, commaIdx);
      const type = meta.match(/^data:([^;,]+)/)?.[1] || "application/octet-stream";
      const isBase64 = meta.includes(";base64");
      const payload = source.slice(commaIdx + 1).replace(/\s/g, "");
      console.log(`[compile] asset "${filename}": data URL, isBase64=${isBase64}, payloadLen=${payload.length}`);
      const buffer = Buffer.from(isBase64 ? payload : decodeURIComponent(payload), isBase64 ? "base64" : "utf-8");
      const bytes = new Uint8Array(buffer);
      validateAssetBytes(filename, bytes);
      return { filename, bytes, type };
    }

    console.log(`[compile] asset "${filename}": fetching from URL: ${source.slice(0, 80)}...`);
    const response = await fetch(source, { signal: AbortSignal.timeout(30000) });
    console.log(`[compile] asset "${filename}": HTTP ${response.status}, content-type="${response.headers.get("content-type")}"`);
    if (!response.ok) {
      console.warn(`[compile] Failed to fetch asset "${filename}": HTTP ${response.status}`);
      return null;
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    validateAssetBytes(filename, bytes);
    return {
      filename,
      bytes,
      type: response.headers.get("content-type") || "application/octet-stream",
    };
  } catch (err: any) {
    console.warn(`[compile] Failed to load asset "${filename}":`, err?.message || err);
    return null;
  }
}

// ─── Primary Compiler: Ytotech (latex.ytotech.com) ───────────────────────────

async function compileWithYtotech(
  textToCompile: string,
  filesMap: Record<string, string>,
  assets: CompileAsset[] = [],
  engine: "pdflatex" | "xelatex" = "pdflatex"
): Promise<Response> {
  const resources: Array<{ main?: boolean; path?: string; content?: string; file?: string }> = [];

  // Main LaTeX file
  resources.push({
    main: true,
    path: "main.tex",
    content: textToCompile,
  });

  // Additional text/project files (.tex, .cls, .sty, .bib, etc.)
  for (const [fname, fcontent] of Object.entries(filesMap)) {
    const normName = normalizePath(fname);
    if (!fcontent || typeof fcontent !== "string" || !fcontent.trim()) continue;
    resources.push({
      path: normName,
      content: fcontent,
    });
  }

  // Binary image assets sent as Base64 strings
  for (const asset of assets) {
    const normName = normalizePath(asset.filename);
    resources.push({
      path: normName,
      file: Buffer.from(asset.bytes).toString("base64"),
    });
  }

  const response = await fetch("https://latex.ytotech.com/builds/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      compiler: engine,
      resources,
    }),
    signal: AbortSignal.timeout(60000),
  });

  return response;
}

// ─── Secondary Fallback Compiler: TeXLive.net ────────────────────────────────

async function compileWithTexLive(
  textToCompile: string,
  assets: CompileAsset[] = [],
  engine: "pdflatex" | "xelatex" = "pdflatex"
): Promise<Response> {
  const crlfContent = textToCompile.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");

  const formData = new FormData();
  const texFile = new File([crlfContent], "document.tex", { type: "text/plain" });
  formData.append("filecontents[]", texFile);
  formData.append("filename[]", "document.tex");

  const appendedFilenames = new Set<string>();
  for (const asset of assets) {
    const baseName = getBaseName(asset.filename);
    if (appendedFilenames.has(baseName)) continue;
    appendedFilenames.add(baseName);
    formData.append("filecontents[]", new File([Buffer.from(asset.bytes)], baseName, { type: asset.type }));
    formData.append("filename[]", baseName);
  }

  formData.append("engine", engine);
  formData.append("return", "pdf");

  const response = await fetch("https://texlive.net/cgi-bin/latexcgi", {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(60000),
    redirect: "follow",
  });

  return response;
}

// ─── Response Parser ────────────────────────────────────────────────────────────

async function processCompilerResponse(
  response: Response,
  engineName: string
): Promise<{ success: true; pdfBase64: string; log: string } | { success: false; error: string }> {
  console.log(`[compile] ${engineName} returned status=${response.status}, content-type="${response.headers.get("content-type")}"`);

  const contentType = response.headers.get("content-type") || "";

  if (response.ok && (contentType.includes("application/pdf") || response.status === 201 || response.status === 200)) {
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.subarray(0, 4).toString() === "%PDF") {
      return {
        success: true,
        pdfBase64: buffer.toString("base64"),
        log: `Compiled successfully via ${engineName}`,
      };
    }
  }

  // Extract log text from JSON or plaintext response
  let logText = "";
  try {
    const text = await response.text();
    if (text.trim().startsWith("{")) {
      const data = JSON.parse(text);
      if (data.log_files && typeof data.log_files === "object") {
        logText = Object.values(data.log_files).join("\n\n");
      } else if (typeof data.logs === "string") {
        logText = data.logs;
      } else if (data.error) {
        logText = typeof data.error === "string" ? data.error : JSON.stringify(data.error);
      }
    } else {
      logText = text;
    }
  } catch (err: any) {
    logText = `Failed to read error response: ${err?.message || err}`;
  }

  console.warn(`[compile] ${engineName} non-PDF response log (first 600 chars):`, logText.substring(0, 600));

  // Scan log for LaTeX `!` error lines
  const scanLines = logText.split("\n");
  const errorBlocks: string[] = [];
  for (let i = 0; i < scanLines.length && errorBlocks.length < 5; i++) {
    if (scanLines[i].startsWith("!")) {
      const block = scanLines.slice(i, Math.min(i + 6, scanLines.length)).join("\n").trim();
      errorBlocks.push(block);
    }
  }

  if (errorBlocks.length > 0) {
    return { success: false, error: errorBlocks.join("\n\n") };
  }

  const logTail = logText.slice(-1200).trim();
  return { success: false, error: logTail || `${engineName} compilation failed (no PDF output)` };
}

// ─── API Endpoint ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, mainFile, files } = body;

    let textToCompile = "";
    const filesMap: Record<string, string> = {};
    const assetSources: Record<string, string> = {};

    if (files && typeof files === "object" && Object.keys(files).length > 0) {
      for (const [k, v] of Object.entries(files)) {
        if (typeof v !== "string" || v.startsWith("blob:")) continue;

        const normalizedKey = normalizePath(k);
        if (isAssetReference(v)) {
          assetSources[normalizedKey] = v;
        } else {
          filesMap[normalizedKey] = v;
        }
      }

      const mainKey = findMainLatexFile(mainFile, filesMap);
      console.log(`[compile] Identified main document: "${mainKey}" out of ${Object.keys(filesMap).length} project files`);

      // Inline all \input{} / \include{} dependencies into main file
      const resolvedLatex = resolveLatexImports(mainKey, filesMap);
      console.log(`[compile] Inlined document size: ${resolvedLatex.length} characters`);

      if (!resolvedLatex.includes("\\documentclass")) {
        return NextResponse.json(
          {
            success: false,
            error: "No \\documentclass found in project files. Please make sure main.tex contains \\documentclass{...}.",
          },
          { status: 400 }
        );
      }

      // Embed auxiliary files (.cls, .sty, .bib) into preamble using filecontents* (for fallback engines)
      let preambleFiles = "";
      for (const [fname, fcontent] of Object.entries(filesMap)) {
        const normName = normalizePath(fname);
        if (normName === normalizePath(mainKey)) continue;
        if (!fcontent || typeof fcontent !== "string" || !fcontent.trim()) continue;

        const baseName = normName.split("/").pop() || normName;
        const lower = baseName.toLowerCase();
        if (/\.(cls|sty|bib|bst|cfg|clo|def)$/i.test(lower)) {
          preambleFiles += `\\begin{filecontents*}{${baseName}}\n${fcontent}\n\\end{filecontents*}\n`;
        }
      }

      textToCompile = preambleFiles ? `${preambleFiles}\n${resolvedLatex}` : resolvedLatex;
    } else {
      textToCompile = content || "";
    }

    const assetNames = Object.keys(assetSources);
    const referencedSvg = findReferencedSvgAsset(textToCompile, assetNames);
    if (referencedSvg) {
      return NextResponse.json(
        {
          success: false,
          error: `SVG preview is supported in Texly, but PDF compilation with pdflatex does not support SVG directly: ${referencedSvg}. Please use a PNG or JPG version in \\includegraphics.`,
        },
        { status: 400 }
      );
    }

    textToCompile = rewriteIncludeGraphicsPaths(textToCompile, assetNames);

    if (textToCompile.includes("\\includegraphics")) {
      if (!textToCompile.includes("graphicx")) {
        textToCompile = `\\RequirePackage{graphicx}\n${textToCompile}`;
      }
    }

    if (!textToCompile.trim()) {
      return NextResponse.json({ success: false, error: "No LaTeX content provided" }, { status: 400 });
    }

    const preferredEngine = shouldPreferXeLaTeX(textToCompile) ? "xelatex" : "pdflatex";
    const fallbackEngine: "pdflatex" | "xelatex" = preferredEngine === "xelatex" ? "pdflatex" : "xelatex";

    const compilableAssetSources = Object.fromEntries(
      Object.entries(assetSources).filter(([filename]) => PDFLATEX_GRAPHICS_EXTENSIONS.has(getFileExtension(filename)))
    );
    const assets = (await Promise.all(
      Object.entries(compilableAssetSources).map(([filename, source]) => loadCompileAsset(filename, source))
    )).filter((asset): asset is CompileAsset => asset !== null);

    if (Object.keys(compilableAssetSources).length > 0) {
      console.log(`[compile] Loaded ${assets.length}/${Object.keys(compilableAssetSources).length} image asset(s) for compilation`);
    }

    const compilerErrors: string[] = [];

    // 1. Primary Engine: Ytotech (latex.ytotech.com) with preferred engine
    try {
      const ytotechResp = await compileWithYtotech(textToCompile, filesMap, assets, preferredEngine);
      const res = await processCompilerResponse(ytotechResp, `Ytotech/${preferredEngine}`);
      if (res.success) {
        return NextResponse.json(res);
      }
      compilerErrors.push(`Ytotech/${preferredEngine}: ${res.error}`);
      console.warn(`[compile] Ytotech/${preferredEngine} failed, trying ${fallbackEngine}:`, res.error.substring(0, 200));
    } catch (err: any) {
      compilerErrors.push(`Ytotech/${preferredEngine}: ${err?.message || err}`);
      console.warn(`[compile] Ytotech/${preferredEngine} network error:`, err?.message || err);
    }

    // 2. Ytotech with fallback engine (e.g. pdflatex if xelatex failed)
    try {
      const ytotechFallbackResp = await compileWithYtotech(textToCompile, filesMap, assets, fallbackEngine);
      const res = await processCompilerResponse(ytotechFallbackResp, `Ytotech/${fallbackEngine}`);
      if (res.success) {
        return NextResponse.json(res);
      }
      compilerErrors.push(`Ytotech/${fallbackEngine}: ${res.error}`);
      console.warn(`[compile] Ytotech/${fallbackEngine} failed, trying TeXLive.net:`, res.error.substring(0, 200));
    } catch (err: any) {
      compilerErrors.push(`Ytotech/${fallbackEngine}: ${err?.message || err}`);
      console.warn(`[compile] Ytotech/${fallbackEngine} network error:`, err?.message || err);
    }

    // 3. Fallback Engine: TeXLive.net
    try {
      const texliveResp = await compileWithTexLive(textToCompile, assets, preferredEngine);
      const res = await processCompilerResponse(texliveResp, `TeXLive/${preferredEngine}`);
      if (res.success) {
        return NextResponse.json(res);
      }
      compilerErrors.push(`TeXLive/${preferredEngine}: ${res.error}`);
    } catch (err: any) {
      compilerErrors.push(`TeXLive/${preferredEngine}: ${err?.message || err}`);
    }

    return NextResponse.json(
      {
        success: false,
        error: compilerErrors.join("\n\n") || "LaTeX compilation failed. Please check your document syntax or package references.",
      },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[compile] API Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal compilation error" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";

function normalizePath(path: string): string {
  return path.replace(/^\.\//, "").trim();
}

function getDir(filePath: string): string {
  const norm = normalizePath(filePath);
  const lastSlash = norm.lastIndexOf("/");
  return lastSlash !== -1 ? norm.slice(0, lastSlash + 1) : "";
}

function resolveLatexImports(
  filename: string,
  filesMap: Record<string, string>,
  visited = new Set<string>()
): string {
  const normalizedFilename = normalizePath(filename);

  if (visited.has(normalizedFilename)) {
    return `\n% Circular reference detected for ${normalizedFilename}\n`;
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

  const lines = rawContent.split("\n");
  const processedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("%")) return line;

    // Remove any comment part starting from unescaped %
    let codePart = line;
    let commentPart = "";
    const commentIndex = line.search(/(?<!\\)%/);
    if (commentIndex !== -1) {
      codePart = line.slice(0, commentIndex);
      commentPart = line.slice(commentIndex);
    }

    const importRegex = /\\(input|include)\s*(?:\{([^}]+)\}|([^\s%#{}]+))/g;
    const replacedCode = codePart.replace(importRegex, (match, cmd, path1, path2) => {
      const targetPath = normalizePath(path1 || path2 || "");
      if (!targetPath) return match;

      const currentDir = getDir(filename);

      const candidateKeys = [
        currentDir + targetPath,
        currentDir + (targetPath.endsWith(".tex") ? targetPath : `${targetPath}.tex`),
        targetPath,
        targetPath.endsWith(".tex") ? targetPath : `${targetPath}.tex`,
        targetPath.endsWith(".tex") ? targetPath.slice(0, -4) : targetPath,
      ];

      const foundKey = Object.keys(filesMap).find((k) => {
        const normK = normalizePath(k);
        return candidateKeys.some((c) => normalizePath(c) === normK);
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

async function compileWithTexLive(textToCompile: string) {
  // texlive.net's CGI script is extremely sensitive to:
  // 1. CRLF (\r\n) line endings in the LaTeX content
  // 2. CRLF line endings in the multipart boundaries themselves
  // Node.js fetch+FormData does NOT guarantee CRLF, so we manually construct
  // the multipart body as a Buffer — this is the only reliable approach.
  // Reference: https://sakhnik.com/2022/08/23/texlive-net.html
  //            https://davidcarlisle.github.io/latexcgi/#http-requests

  // Normalize content to CRLF
  const crlfContent = textToCompile.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");

  const boundary = "----TexlyBoundary" + Math.random().toString(36).substring(2, 10);
  const CRLF = "\r\n";

  // Build parts manually as strings then encode to Buffer
  const part1Header =
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="filecontents[]"; filename="main.tex"${CRLF}` +
    `Content-Type: text/plain${CRLF}${CRLF}`;

  const part2 =
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="filename[]"${CRLF}${CRLF}` +
    `main.tex${CRLF}`;

  const part3 =
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="engine"${CRLF}${CRLF}` +
    `pdflatex${CRLF}`;

  const part4 =
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="return"${CRLF}${CRLF}` +
    `pdf${CRLF}`;

  const closing = `--${boundary}--${CRLF}`;

  // Encode each section to Buffer and concatenate — ensures no encoding surprises
  const bodyBuffer = Buffer.concat([
    Buffer.from(part1Header, "utf-8"),
    Buffer.from(crlfContent, "utf-8"),
    Buffer.from(CRLF, "utf-8"),
    Buffer.from(part2, "utf-8"),
    Buffer.from(part3, "utf-8"),
    Buffer.from(part4, "utf-8"),
    Buffer.from(closing, "utf-8"),
  ]);

  const response = await fetch("https://texlive.net/cgi-bin/latexcgi", {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": String(bodyBuffer.length),
    },
    body: bodyBuffer,
    signal: AbortSignal.timeout(45000),
    // @ts-ignore - allow redirect following
    redirect: "follow",
  });

  return response;
}

async function compileWithLatexOnline(textToCompile: string) {
  const compileUrl = `https://latexonline.cc/compile?text=${encodeURIComponent(textToCompile)}`;
  const response = await fetch(compileUrl, {
    method: "GET",
    headers: { Accept: "application/pdf" },
    signal: AbortSignal.timeout(25000),
  });
  return response;
}

function findMainLatexFile(mainFileParam: string, filesMap: Record<string, string>): string {
  const normMainParam = normalizePath(mainFileParam || "");
  const keys = Object.keys(filesMap);
  if (keys.length === 0) return "";

  const hasDocClass = (k: string) => (filesMap[k] || "").includes("\\documentclass");

  const isMainFilename = (k: string) => {
    const normK = normalizePath(k).toLowerCase();
    return normK === "main.tex" || normK.endsWith("/main.tex");
  };

  // Step 1: If mainFileParam is valid and contains \documentclass, use it directly
  if (normMainParam && filesMap[normMainParam] !== undefined && hasDocClass(normMainParam)) {
    return normMainParam;
  }

  // Step 2: Check if any file is named main.tex (or ends with /main.tex) AND contains \documentclass
  const mainFileWithDocClass = keys.find((k) => isMainFilename(k) && hasDocClass(k));
  if (mainFileWithDocClass) {
    return normalizePath(mainFileWithDocClass);
  }

  // Step 3: Check if ANY file contains \documentclass
  const anyDocClassFile = keys.find((k) => hasDocClass(k));
  if (anyDocClassFile) {
    return normalizePath(anyDocClassFile);
  }

  // Step 4: Check if any file is named main.tex (or ends with /main.tex)
  const anyMainFile = keys.find((k) => isMainFilename(k));
  if (anyMainFile) {
    return normalizePath(anyMainFile);
  }

  // Step 5: Any .tex file or first key
  const anyTexFile = keys.find((k) => normalizePath(k).toLowerCase().endsWith(".tex"));
  if (anyTexFile) {
    return normalizePath(anyTexFile);
  }

  return normalizePath(keys[0]);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, mainFile, files } = body;

    let textToCompile = "";

    if (files && typeof files === "object" && Object.keys(files).length > 0) {
      const filesMap: Record<string, string> = {};
      for (const [k, v] of Object.entries(files)) {
        if (typeof v === "string") {
          filesMap[normalizePath(k)] = v;
        }
      }

      const mainKey = findMainLatexFile(mainFile, filesMap);

      if (content && mainKey && filesMap[mainKey] !== undefined) {
        filesMap[mainKey] = content;
      } else if (content && mainKey && filesMap[mainKey] === undefined) {
        filesMap[mainKey] = content;
      }

      const resolvedLatex = resolveLatexImports(mainKey, filesMap);

      console.log(`[compile] mainKey="${mainKey}" resolvedLatex length=${resolvedLatex.length}`);
      console.log(`[compile] resolvedLatex preview:`, resolvedLatex.substring(0, 300));

      if (!resolvedLatex.includes("\\documentclass")) {
        console.error("[compile] No \\documentclass found in resolved content. filesMap keys:", Object.keys(filesMap));
        return NextResponse.json(
          {
            success: false,
            error:
              "No valid main document found with \\documentclass{...}. Please make sure your main.tex file contains a \\documentclass directive.",
          },
          { status: 400 }
        );
      }

      // Embed ONLY non-tex auxiliary files (.cls, .sty, .bib, .bst, etc.) via filecontents*.
      // .tex section files are already inlined by resolveLatexImports above — do NOT double-embed them.
      let fileContentsHeaders = "";
      for (const [fname, fcontent] of Object.entries(filesMap)) {
        const normName = normalizePath(fname);
        if (normName === normalizePath(mainKey)) continue;
        if (!fcontent || typeof fcontent !== "string" || !fcontent.trim()) continue;

        const lowerName = normName.toLowerCase();
        // Only embed true auxiliary files — NOT .tex files (those are already inlined)
        const isAuxiliary = /\.(cls|sty|bib|bst|cfg|clo|def|ins|dtx)$/i.test(lowerName);

        if (isAuxiliary) {
          fileContentsHeaders += `\\begin{filecontents*}{${normName}}\n${fcontent}\n\\end{filecontents*}\n`;
        }
      }

      textToCompile = fileContentsHeaders ? `${fileContentsHeaders}\n${resolvedLatex}` : resolvedLatex;
      console.log(`[compile] Final textToCompile length=${textToCompile.length}, has fileContentsHeaders=${!!fileContentsHeaders}`);
    } else {
      textToCompile = content || "";
    }

    if (!textToCompile.trim()) {
      return NextResponse.json({ success: false, error: "No LaTeX content provided" }, { status: 400 });
    }

    let response: Response | null = null;
    let engineUsed = "TeXLive Engine";

    // Try primary POST service (TeXLive)
    try {
      response = await compileWithTexLive(textToCompile);
    } catch (err: any) {
      console.warn("TeXLive POST compile failed, trying fallback...", err?.message || err);
    }

    // Try fallback service (LaTeXOnline) if primary failed or was unreachable
    if (!response || !response.ok) {
      try {
        const fallbackResp = await compileWithLatexOnline(textToCompile);
        if (fallbackResp.ok || !response) {
          response = fallbackResp;
          engineUsed = "LaTeXOnline Engine";
        }
      } catch (err: any) {
        console.warn("LaTeXOnline fallback compile failed:", err?.message || err);
      }
    }

    if (!response) {
      return NextResponse.json(
        {
          success: false,
          error: "LaTeX compilation services are currently unreachable. Please check your network or try again.",
        },
        { status: 503 }
      );
    }

    const contentType = response.headers.get("content-type") || "";
    console.log(`[compile] Response status=${response.status} content-type="${contentType}" url="${response.url}"`);

    if (response.ok && (contentType.includes("pdf") || contentType.includes("application/pdf"))) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Check if valid PDF header (%PDF-)
      if (buffer.subarray(0, 4).toString() === "%PDF") {
        const base64Pdf = buffer.toString("base64");
        return NextResponse.json({
          success: true,
          pdfBase64: base64Pdf,
          log: `Compiled successfully via ${engineUsed}`,
        });
      } else {
        const textLog = buffer.toString("utf-8");
        console.warn("[compile] Response had PDF content-type but no %PDF header. Body:", textLog.substring(0, 500));
        return NextResponse.json(
          {
            success: false,
            error: textLog || "Compilation failed (Invalid PDF output)",
          },
          { status: 400 }
        );
      }
    } else if (response.ok) {
      // Got a 200 but not a PDF (likely HTML error page or log from texlive.net)
      const bodyText = await response.text();
      console.warn("[compile] Non-PDF 200 response from texlive.net. Body (first 1000 chars):", bodyText.substring(0, 1000));

      // Try to extract useful error info from the response
      const errorMatch = bodyText.match(/!(.*?)\n/g);
      const errorLines = errorMatch ? errorMatch.slice(0, 5).join(" ").trim() : "";

      return NextResponse.json(
        {
          success: false,
          error: errorLines || bodyText.substring(0, 500) || `LaTeX Compilation error (HTTP status ${response.status})`,
        },
        { status: 400 }
      );
    } else {
      const errorText = await response.text();
      console.warn(`[compile] Error response ${response.status}. Body:`, errorText.substring(0, 500));
      return NextResponse.json(
        {
          success: false,
          error: errorText || `LaTeX Compilation error (HTTP status ${response.status})`,
        },
        { status: 400 }
      );
    }
  } catch (err: any) {
    console.error("Compile API Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to reach LaTeX compilation server",
      },
      { status: 500 }
    );
  }
}



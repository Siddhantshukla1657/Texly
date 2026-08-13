"use client";
import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Props {
  pdfBytes: Uint8Array | null;
  compileStatus: "idle" | "compiling" | "success" | "error";
}

export default function PdfPreview({ pdfBytes, compileStatus }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [rendering, setRendering] = useState<boolean>(false);

  useEffect(() => {
    if (!pdfBytes || pdfBytes.length === 0) return;

    let isCancelled = false;
    setRendering(true);

    async function renderPdf() {
      if (!pdfBytes) return;
      try {
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
        const pdf = await loadingTask.promise;
        if (isCancelled) return;

        setNumPages(pdf.numPages);

        if (!containerRef.current) return;
        containerRef.current.innerHTML = ""; // Clear existing pages

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (isCancelled) return;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.className = "pdf-page-canvas";
          canvas.style.marginBottom = "16px";
          canvas.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
          canvas.style.borderRadius = "4px";
          canvas.style.background = "#fff";

          const context = canvas.getContext("2d");
          if (!context) continue;

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          const renderContext = {
            canvasContext: context,
            viewport,
          };

          await page.render(renderContext).promise;
          if (containerRef.current) {
            containerRef.current.appendChild(canvas);
          }
        }
      } catch (err) {
        console.error("PDF render error:", err);
      } finally {
        if (!isCancelled) setRendering(false);
      }
    }

    renderPdf();

    return () => {
      isCancelled = true;
    };
  }, [pdfBytes, scale]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-surface">
      {/* Control bar */}
      <div
        style={{
          height: "36px",
          background: "var(--bg-chrome)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: "8px",
          fontSize: "12px",
          color: "var(--text-muted)",
        }}
      >
        <span>Preview</span>
        {numPages > 0 && <span>({numPages} page{numPages > 1 ? "s" : ""})</span>}
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
          style={{ padding: "2px 6px" }}
        >
          -
        </button>
        <span>{Math.round(scale * 100)}%</span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
          style={{ padding: "2px 6px" }}
        >
          +
        </button>
      </div>

      {/* Render area */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: "auto",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "#2a2d3e",
        }}
      >
        {!pdfBytes && (
          <div className="empty-state">
            <div className="empty-state-icon">📑</div>
            <div className="empty-state-text">
              {compileStatus === "compiling"
                ? "Compiling PDF..."
                : "No compiled PDF yet. Click Compile or start typing."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

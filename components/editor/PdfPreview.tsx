"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface Props {
  pdfBytes: Uint8Array | null;
  compileStatus: "idle" | "compiling" | "success" | "error";
}

export default function PdfPreview({ pdfBytes, compileStatus }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [isRendering, setIsRendering] = useState(false);

  const renderPdf = useCallback(async () => {
    if (!pdfBytes || pdfBytes.length === 0 || !containerRef.current) return;

    setIsRendering(true);
    try {
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
      const pdf = await loadingTask.promise;

      setNumPages(pdf.numPages);

      // Clear old pages
      containerRef.current.innerHTML = "";

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        // Page wrapper (adds shadow + spacing)
        const wrapper = document.createElement("div");
        wrapper.style.cssText = `
          position: relative;
          margin: 0 auto 20px;
          width: ${viewport.width}px;
          box-shadow: 0 4px 20px rgba(15,23,42,0.18), 0 1px 4px rgba(15,23,42,0.10);
          border-radius: 3px;
          background: #fff;
          flex-shrink: 0;
        `;

        const canvas = document.createElement("canvas");
        canvas.style.cssText = `
          display: block;
          width: ${viewport.width}px;
          height: ${viewport.height}px;
          border-radius: 3px;
        `;

        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Page number label
        const label = document.createElement("div");
        label.style.cssText = `
          position: absolute;
          bottom: -26px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 11px;
          color: #94A3B8;
          font-family: var(--font-mono);
          white-space: nowrap;
          user-select: none;
        `;
        label.textContent = `Page ${pageNum} of ${pdf.numPages}`;

        await page.render({ canvasContext: ctx, viewport }).promise;

        wrapper.appendChild(canvas);
        wrapper.appendChild(label);

        if (containerRef.current) {
          containerRef.current.appendChild(wrapper);
        }
      }
    } catch (err) {
      console.error("PDF render error:", err);
    } finally {
      setIsRendering(false);
    }
  }, [pdfBytes, scale]);

  useEffect(() => {
    renderPdf();
  }, [renderPdf]);

  const zoomOut = () => setScale((s) => Math.max(0.5, parseFloat((s - 0.15).toFixed(2))));
  const zoomIn  = () => setScale((s) => Math.min(3.0, parseFloat((s + 0.15).toFixed(2))));
  const zoomReset = () => setScale(1.2);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        background: "#F0F4F9",
      }}
    >
      {/* ── Toolbar ── */}
      <div
        style={{
          height: "44px",
          flexShrink: 0,
          background: "#FFFFFF",
          borderBottom: "1px solid #E1E8F0",
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          gap: "10px",
          boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
        }}
      >
        {/* Label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            fontWeight: 600,
            color: "#334155",
            letterSpacing: "0.01em",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          PDF Preview
        </div>

        {/* Page count */}
        {numPages > 0 && (
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              background: "#EEF4FF",
              color: "#2563EB",
              border: "1px solid rgba(37,99,235,0.15)",
              borderRadius: "4px",
              padding: "2px 7px",
            }}
          >
            {numPages} page{numPages !== 1 ? "s" : ""}
          </span>
        )}

        {/* Rendering indicator */}
        {isRendering && (
          <span
            style={{
              fontSize: "11px",
              color: "#94A3B8",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              style={{ animation: "spin 0.7s linear infinite" }}
              fill="none"
              stroke="#94A3B8"
              strokeWidth="2.5"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Rendering…
          </span>
        )}

        <div style={{ flex: 1 }} />

        {/* Zoom controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2px",
            background: "#F7F9FC",
            border: "1px solid #E1E8F0",
            borderRadius: "7px",
            padding: "2px",
          }}
        >
          <button
            onClick={zoomOut}
            title="Zoom out"
            style={{
              width: "26px",
              height: "26px",
              border: "none",
              background: "transparent",
              borderRadius: "5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#475569",
              fontSize: "16px",
              lineHeight: 1,
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#E1E8F0")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            −
          </button>

          <button
            onClick={zoomReset}
            title="Reset zoom"
            style={{
              padding: "0 8px",
              height: "26px",
              border: "none",
              background: "transparent",
              borderRadius: "5px",
              cursor: "pointer",
              color: "#334155",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              minWidth: "46px",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#E1E8F0")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            onClick={zoomIn}
            title="Zoom in"
            style={{
              width: "26px",
              height: "26px",
              border: "none",
              background: "transparent",
              borderRadius: "5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#475569",
              fontSize: "16px",
              lineHeight: 1,
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#E1E8F0")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            +
          </button>
        </div>
      </div>

      {/* ── PDF Scroll area ── */}
      <div
        className="pdf-scroll-area"
        style={{
          flex: 1,
          padding: numPages > 0 ? "28px 20px 40px" : "0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "#E8EDF4",
          position: "relative",
        }}
      >
        {/* Empty / compiling state */}
        {!pdfBytes && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "14px",
              color: "#64748B",
              textAlign: "center",
              padding: "24px",
            }}
          >
            {compileStatus === "compiling" ? (
              <>
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="1.5"
                  style={{ animation: "spin 1s linear infinite" }}
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <div>
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "#334155",
                      marginBottom: "4px",
                    }}
                  >
                    Typesetting document…
                  </div>
                  <div style={{ fontSize: "12px", color: "#94A3B8" }}>
                    This may take a few seconds
                  </div>
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.70)",
                    border: "1px solid rgba(255,255,255,0.90)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#94A3B8"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "#334155",
                      marginBottom: "4px",
                    }}
                  >
                    No output yet
                  </div>
                  <div style={{ fontSize: "12px", color: "#94A3B8", lineHeight: 1.6 }}>
                    Press{" "}
                    <kbd
                      style={{
                        display: "inline-block",
                        padding: "2px 7px",
                        background: "#fff",
                        border: "1px solid #CBD5E1",
                        borderRadius: "5px",
                        fontSize: "11px",
                        fontFamily: "var(--font-mono)",
                        boxShadow: "0 1px 0 #CBD5E1",
                        color: "#334155",
                        fontWeight: 600,
                      }}
                    >
                      Ctrl+Enter
                    </kbd>{" "}
                    or click the compile button to render your PDF
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Canvas pages mount here */}
        <div
          ref={containerRef}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            paddingBottom: numPages > 0 ? "20px" : "0",
          }}
        />
      </div>

      {/* Spin keyframe injected via style tag */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

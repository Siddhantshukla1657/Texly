"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface Props {
  pdfBytes: Uint8Array | null;
  compileStatus: "idle" | "compiling" | "success" | "error";
}

/* ─── Small icon helpers ──────────────────────────────────────── */
const ChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
);
const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
);
const Minus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const Plus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const Expand = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
);
const Download = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);

const TB_BTN: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "transparent", border: "none", cursor: "pointer",
  borderRadius: 5, padding: "0 6px", height: 28,
  color: "#475569", transition: "background 0.1s",
};

export default function PdfPreview({ pdfBytes, compileStatus }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [numPages,    setNumPages]    = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale,       setScale]       = useState(1.2);
  const [naturalW,    setNaturalW]    = useState(595);
  const [rendering,   setRendering]   = useState(false);

  /* ── Render all pages at current scale ─────────────────────── */
  const renderPdf = useCallback(async () => {
    if (!pdfBytes?.length || !containerRef.current) return;

    setRendering(true);
    try {
      // pdfjs transfers (detaches) the ArrayBuffer on first use; copy so zoom
      // re-renders don't receive a neutered buffer.
      const pdf = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;
      setNumPages(pdf.numPages);
      setCurrentPage(1);
      containerRef.current.innerHTML = "";

      const dpr = window.devicePixelRatio || 1;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page     = await pdf.getPage(i);
        // Compute viewport using scale × dpr so canvas pixels are crisp
        const vp       = page.getViewport({ scale: scale * dpr });
        const cssW     = Math.floor(vp.width  / dpr);
        const cssH     = Math.floor(vp.height / dpr);

        if (i === 1) {
          const baseVp = page.getViewport({ scale: 1 });
          setNaturalW(baseVp.width);
        }

        /* wrapper */
        const wrapper = document.createElement("div");
        wrapper.id = `ppw-${i}`;
        wrapper.setAttribute("data-page", String(i));
        wrapper.style.cssText = [
          `position:relative`,
          `margin:0 auto 32px`,
          `width:${cssW}px`,
          `background:#FAF8F5`,
          `border-radius:4px`,
          `box-shadow:0 4px 24px rgba(15,23,42,0.13),0 1px 3px rgba(15,23,42,0.07)`,
          `flex-shrink:0`,
        ].join(";");

        /* canvas */
        const canvas = document.createElement("canvas");
        canvas.width  = vp.width;
        canvas.height = vp.height;
        canvas.style.cssText = `display:block;width:${cssW}px;height:${cssH}px;border-radius:4px`;

        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport: vp }).promise;

        /* page label */
        const label = document.createElement("div");
        label.style.cssText = [
          `position:absolute;bottom:-22px;left:50%;transform:translateX(-50%)`,
          `font-size:10px;font-weight:500;color:#94A3B8`,
          `font-family:var(--font-mono);white-space:nowrap;user-select:none`,
        ].join(";");
        label.textContent = `${i} / ${pdf.numPages}`;

        wrapper.appendChild(canvas);
        wrapper.appendChild(label);
        containerRef.current?.appendChild(wrapper);
      }
    } catch (e) {
      console.error("PDF render error:", e);
    } finally {
      setRendering(false);
    }
  }, [pdfBytes, scale]); // scale in deps → zoom triggers re-render

  useEffect(() => { renderPdf(); }, [renderPdf]);

  /* ── Scroll-tracker: update currentPage as user scrolls ─────── */
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el || numPages === 0) return;
    const onScroll = () => {
      const top = el.getBoundingClientRect().top;
      let best = 1, bestDist = Infinity;
      el.querySelectorAll("[data-page]").forEach((node) => {
        const dist = Math.abs(node.getBoundingClientRect().top - top);
        if (dist < bestDist) { bestDist = dist; best = +node.getAttribute("data-page")!; }
      });
      setCurrentPage(best);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [numPages]);

  /* ── Navigation ──────────────────────────────────────────────── */
  const scrollToPage = (n: number) => {
    const target = Math.max(1, Math.min(numPages, n));
    const el     = scrollAreaRef.current;
    const node   = el?.querySelector(`[data-page="${target}"]`) as HTMLElement | null;
    if (!el || !node) return;
    const offset = node.offsetTop - 24;
    el.scrollTo({ top: offset, behavior: "smooth" });
    setCurrentPage(target);
  };

  /* ── Zoom ────────────────────────────────────────────────────── */
  const zoomOut   = () => setScale(s => Math.max(0.3, +(s - 0.15).toFixed(2)));
  const zoomIn    = () => setScale(s => Math.min(3.0, +(s + 0.15).toFixed(2)));
  const zoomReset = () => setScale(1.0);

  const fitWidth  = () => {
    if (!scrollAreaRef.current) return;
    const avail = scrollAreaRef.current.clientWidth - 48; // margin padding
    if (avail > 0 && naturalW > 0) {
      const target = avail / naturalW;
      setScale(Math.max(0.3, Math.min(3.0, +target.toFixed(2))));
    } else {
      setScale(0.85);
    }
  };

  /* ── Download ────────────────────────────────────────────────── */
  const download = () => {
    if (!pdfBytes?.length) return;
    const url = URL.createObjectURL(new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" }));
    const a   = Object.assign(document.createElement("a"), { href: url, download: "document.pdf" });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ── Toolbar styles ─────────────────────────────────────────── */
  const sep: React.CSSProperties = { width: 1, height: 18, background: "#E2DDD5", flexShrink: 0 };

  const containerW = scrollAreaRef.current?.clientWidth ?? 600;
  const currentRenderedW = scale * naturalW;
  const isOverflowing = currentRenderedW > (containerW - 48);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", width:"100%", overflow:"hidden", background:"#F4F1EA" }}>

      {/* ══ Toolbar ══════════════════════════════════════════════ */}
      <div style={{
        height: 42, flexShrink: 0,
        background: "#FAF8F5",
        borderBottom: "1px solid #E2DDD5",
        display: "flex", alignItems: "center",
        padding: "0 10px", gap: 6,
        boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
        overflowX: "auto",
        overflowY: "hidden",
        whiteSpace: "nowrap",
        minWidth: 0,
      }}>

        {/* Label */}
        <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap", marginRight: 4, flexShrink: 0 }}>
          PDF
        </span>

        {rendering && (
          <span style={{ fontSize: 11, color: "#94A3B8", whiteSpace: "nowrap", flexShrink: 0 }}>Rendering…</span>
        )}

        {numPages > 0 && (
          <>
            {/* Page nav */}
            <div style={sep} />
            <div style={{ display:"flex", alignItems:"center", gap:0, background:"#F4F1EA", border:"1px solid #E2DDD5", borderRadius:6, overflow:"hidden", flexShrink: 0 }}>
              <button
                style={{ ...TB_BTN, borderRadius: 0, paddingLeft: 8, paddingRight: 8 }}
                onClick={() => scrollToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                title="Previous page"
              ><ChevronLeft /></button>
              <span style={{ fontSize:11, fontWeight:700, padding:"0 6px", fontFamily:"var(--font-mono)", color:"#334155", whiteSpace:"nowrap" }}>
                {currentPage} / {numPages}
              </span>
              <button
                style={{ ...TB_BTN, borderRadius: 0, paddingLeft: 8, paddingRight: 8 }}
                onClick={() => scrollToPage(currentPage + 1)}
                disabled={currentPage >= numPages}
                title="Next page"
              ><ChevronRight /></button>
            </div>

            {/* Zoom */}
            <div style={sep} />
            <div style={{ display:"flex", alignItems:"center", gap:0, background:"#F4F1EA", border:"1px solid #E2DDD5", borderRadius:6, overflow:"hidden", flexShrink: 0 }}>
              <button style={{ ...TB_BTN, borderRadius:0, paddingLeft:7, paddingRight:7 }} onClick={zoomOut}  title="Zoom out"><Minus /></button>
              <button style={{ ...TB_BTN, borderRadius:0, paddingLeft:6, paddingRight:6, fontSize:11, fontFamily:"var(--font-mono)", fontWeight:700, color:"#334155", minWidth:40 }} onClick={zoomReset} title="Reset zoom (100%)">
                {Math.round(scale * 100)}%
              </button>
              <button style={{ ...TB_BTN, borderRadius:0, paddingLeft:7, paddingRight:7 }} onClick={zoomIn}   title="Zoom in"><Plus /></button>
            </div>

            {/* Fit + Download */}
            <div style={sep} />
            <button style={{ ...TB_BTN, gap:4, fontSize:11, fontWeight:500, paddingLeft:8, paddingRight:8, flexShrink: 0 }} onClick={fitWidth} title="Fit to width">
              <Expand /><span>Fit</span>
            </button>

            <div style={{ flex:1, minWidth: 8 }} />

            <button
              style={{ ...TB_BTN, gap:5, background:"#2563EB", color:"#fff", fontSize:11, fontWeight:600, paddingLeft:10, paddingRight:10, borderRadius:6, boxShadow:"0 1px 3px rgba(37,99,235,.3)", flexShrink: 0 }}
              onClick={download}
              title="Download PDF"
            ><Download /><span style={{ whiteSpace:"nowrap" }}>Download</span></button>
          </>
        )}
      </div>

      {/* ══ Scrollable PDF canvas area ════════════════════════════ */}
      <div
        ref={scrollAreaRef}
        className="pdf-scroll-area"
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "auto",
          background: "#E8E4DC",
          position: "relative",
          width: "100%",
          height: "100%",
        }}
      >
        {/* Empty / compiling placeholder */}
        {!pdfBytes && (
          <div style={{
            position:"absolute", inset:0,
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            gap:14, textAlign:"center", padding:24,
          }}>
            {compileStatus === "compiling" ? (
              <>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" style={{ animation:"spin 1s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                <div>
                  <div style={{ fontSize:15, fontWeight:600, color:"#1E293B", marginBottom:4 }}>Typesetting…</div>
                  <div style={{ fontSize:12, color:"#64748B" }}>Compiling your LaTeX document</div>
                </div>
              </>
            ) : (
              <>
                <div style={{ width:56, height:56, borderRadius:14, background:"#FAF8F5", boxShadow:"0 2px 8px rgba(15,23,42,.06)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize:15, fontWeight:600, color:"#1E293B", marginBottom:4 }}>No output yet</div>
                  <div style={{ fontSize:12, color:"#64748B", lineHeight:1.6 }}>
                    Press <kbd style={{ padding:"2px 6px", background:"#FAF8F5", border:"1px solid #CBD5E1", borderRadius:4, fontSize:11, fontFamily:"var(--font-mono)", fontWeight:600, color:"#0F172A" }}>Ctrl+Enter</kbd> to compile
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Page canvases mount here */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: isOverflowing ? "flex-start" : "center",
          width: isOverflowing ? "max-content" : "100%",
          minWidth: "100%",
          padding: numPages > 0 ? "28px 24px 52px" : 0,
          boxSizing: "border-box",
        }}>
          <div ref={containerRef} style={{ display:"flex", flexDirection:"column", alignItems: isOverflowing ? "flex-start" : "center" }} />
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

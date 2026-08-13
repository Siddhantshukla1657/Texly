// LaTeX Web Worker
// Uses SwiftLaTeX / WASM engine to compile LaTeX in a Web Worker

let engine = null;
let engineReady = false;

// Load the PdfTeX engine (SwiftLaTeX)
async function loadEngine() {
  try {
    importScripts("https://cdn.jsdelivr.net/npm/swiftlatex@0.1.1/dist/PdfTeXEngine.js");
    if (typeof PdfTeXEngine !== "undefined") {
      engine = new PdfTeXEngine();
      await engine.loadEngine();
      engineReady = true;
    }
  } catch (err) {
    console.warn("SwiftLaTeX not available:", err);
    engine = null;
    engineReady = false;
  }
}

loadEngine();

self.onmessage = async (event) => {
  if (!event.data || event.data.type !== "compile") return;

  const { files, mainFile } = event.data;

  if (!engineReady || !engine) {
    self.postMessage({
      type: "error",
      log: "LaTeX engine initializing or unavailable. Please try compiling again in a moment.",
    });
    return;
  }

  try {
    for (const [filename, content] of Object.entries(files)) {
      await engine.writeMemFSFile(filename, content);
    }

    engine.setEngineMainFile(mainFile);

    const result = await engine.compileLaTeX();

    if (result && result.status === 0) {
      self.postMessage(
        {
          type: "pdf",
          pdf: result.pdf,
          log: result.log,
        },
        [result.pdf.buffer]
      );
    } else {
      self.postMessage({
        type: "error",
        log: (result && result.log) || "Compilation failed",
      });
    }
  } catch (err) {
    self.postMessage({
      type: "error",
      log: (err && err.message) || String(err),
    });
  }
};

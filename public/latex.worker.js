// LaTeX Web Worker
// Delegates compilation requests to /api/compile server-side endpoint

self.onmessage = async (event) => {
  if (!event.data || event.data.type !== "compile") return;

  const { files, mainFile } = event.data;
  const mainContent = files[mainFile] || Object.values(files)[0] || "";

  try {
    const response = await fetch("/api/compile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: mainContent,
        mainFile,
        files,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success && data.pdfBase64) {
      // Convert Base64 back to Uint8Array for PDF rendering
      const binaryString = atob(data.pdfBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      self.postMessage(
        {
          type: "pdf",
          pdf: bytes,
          log: data.log || "Compiled successfully",
        },
        [bytes.buffer]
      );
    } else {
      self.postMessage({
        type: "error",
        log: data.error || `Compilation failed (HTTP ${response.status})`,
      });
    }
  } catch (err) {
    self.postMessage({
      type: "error",
      log: "Failed to connect to compilation service: " + ((err && err.message) || String(err)),
    });
  }
};

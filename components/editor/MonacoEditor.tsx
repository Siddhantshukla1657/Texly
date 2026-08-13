"use client";
import { useRef, useEffect } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type monaco from "monaco-editor";

interface Props {
  value: string;
  onChange: (value: string) => void;
  filename: string;
  readOnly?: boolean;
  compileLog?: string;
  onLineClick?: (line: number) => void;
}

// Parse error log for line numbers
function parseErrorMarkers(log: string): monaco.editor.IMarkerData[] {
  const markers: monaco.editor.IMarkerData[] = [];
  const regex = /l\.(\d+)/g;
  let match;
  while ((match = regex.exec(log)) !== null) {
    const line = parseInt(match[1]);
    markers.push({
      startLineNumber: line,
      endLineNumber: line,
      startColumn: 1,
      endColumn: 100,
      message: "LaTeX compilation error",
      severity: 8, // Error
    });
  }
  return markers;
}

export default function MonacoEditor({
  value,
  onChange,
  filename,
  readOnly = false,
  compileLog = "",
}: Props) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);

  const isLatex =
    filename.endsWith(".tex") ||
    filename.endsWith(".bib") ||
    filename.endsWith(".sty") ||
    filename.endsWith(".cls");
  const language = filename.endsWith(".bib") ? "bibtex" : isLatex ? "latex" : "plaintext";

  const handleMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;

    try {
      // Define custom Light Off-White Theme
      monacoInstance.editor.defineTheme("texly-light-theme", {
        base: "vs",
        inherit: true,
        rules: [
          { token: "keyword", foreground: "2563EB", fontStyle: "bold" },
          { token: "comment", foreground: "64748B", fontStyle: "italic" },
          { token: "string", foreground: "D97706" },
          { token: "delimiter.curly", foreground: "475569" },
          { token: "delimiter.square", foreground: "475569" },
        ],
        colors: {
          "editor.background": "#FAF8F5",
          "editor.foreground": "#0F172A",
          "editorCursor.foreground": "#2563EB",
          "editor.lineHighlightBackground": "#F2EFE9",
          "editorLineNumber.foreground": "#94A3B8",
          "editorLineNumber.activeForeground": "#2563EB",
          "editorGutter.background": "#FAF8F5",
          "editorWidget.background": "#FAF8F5",
          "editorWidget.border": "#E3DEC3",
          "scrollbarSlider.background": "rgba(148, 163, 184, 0.3)",
          "scrollbarSlider.hoverBackground": "rgba(148, 163, 184, 0.6)",
          "scrollbarSlider.activeBackground": "rgba(37, 99, 235, 0.8)",
        },
      });

      monacoInstance.editor.setTheme("texly-light-theme");

      // Register LaTeX language if not already registered
      const langs = monacoInstance.languages.getLanguages();
      if (!langs.find((l: { id: string }) => l.id === "latex")) {
        monacoInstance.languages.register({ id: "latex" });
        monacoInstance.languages.setMonarchTokensProvider("latex", {
          tokenizer: {
            root: [
              [/\\[a-zA-Z]+\*?/, "keyword"],
              [/%.*$/, "comment"],
              [/\$\$[\s\S]*?\$\$/, "string"],
              [/\$[^$]*\$/, "string"],
              [/\{/, "delimiter.curly"],
              [/\}/, "delimiter.curly"],
              [/\[/, "delimiter.square"],
              [/\]/, "delimiter.square"],
              [/[^\\%${}[\]]+/, ""],
            ],
          },
        });

        // LaTeX completions
        monacoInstance.languages.registerCompletionItemProvider("latex", {
          provideCompletionItems(model: monaco.editor.ITextModel, position: monaco.Position) {
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };
            const suggestions = [
              "\\begin{", "\\end{", "\\section{", "\\subsection{",
              "\\textbf{", "\\textit{", "\\emph{", "\\cite{",
              "\\label{", "\\ref{", "\\includegraphics{",
              "\\frac{}{}", "\\sqrt{}", "\\sum", "\\int",
              "\\alpha", "\\beta", "\\gamma", "\\delta",
              "\\usepackage{", "\\documentclass{",
            ].map((label) => ({
              label,
              kind: monacoInstance.languages.CompletionItemKind.Keyword,
              insertText: label,
              range,
            }));
            return { suggestions };
          },
        });
      }
    } catch {
      // Ignore registration errors if disposed
    }
  };

  useEffect(() => {
    return () => {
      editorRef.current = null;
      monacoRef.current = null;
    };
  }, []);

  // Update error markers when log changes
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    try {
      const model = editorRef.current.getModel();
      if (!model || model.isDisposed()) return;

      if (compileLog && compileLog.includes("Error")) {
        const markers = parseErrorMarkers(compileLog);
        monacoRef.current.editor.setModelMarkers(model, "latex", markers);
      } else {
        monacoRef.current.editor.setModelMarkers(model, "latex", []);
      }
    } catch {
      // Ignore errors if model was disposed
    }
  }, [compileLog]);

  return (
    <div style={{ flex: 1, minHeight: 0, width: "100%", height: "100%", position: "relative" }}>
      <Editor
        key={filename}
        path={filename}
        height="100%"
        language={language}
        value={value}
        onChange={(v) => onChange(v || "")}
        onMount={handleMount}
        options={{
          theme: "texly-light-theme",
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 13,
          lineHeight: 22,
          minimap: { enabled: false },
          wordWrap: "on",
          lineNumbers: "on",
          renderLineHighlight: "line",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          readOnly,
          padding: { top: 12, bottom: 12 },
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          scrollbar: {
            vertical: "visible",
            horizontal: "auto",
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
            useShadows: true,
            verticalHasArrows: false,
            horizontalHasArrows: false,
          },
        }}
      />
    </div>
  );
}

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

    // Define custom Ink Theme
    monacoInstance.editor.defineTheme("texly-ink-theme", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "C8862B", fontStyle: "bold" },
        { token: "comment", foreground: "64748b", fontStyle: "italic" },
        { token: "string", foreground: "1F5C4F" },
        { token: "delimiter.curly", foreground: "E4DCC8" },
        { token: "delimiter.square", foreground: "E4DCC8" },
      ],
      colors: {
        "editor.background": "#191D24",
        "editor.foreground": "#F6F2E8",
        "editorCursor.foreground": "#C8862B",
        "editor.lineHighlightBackground": "#222731",
        "editorLineNumber.foreground": "#4b5563",
        "editorLineNumber.activeForeground": "#F6F2E8",
        "editorGutter.background": "#191D24",
        "editorWidget.background": "#191D24",
        "editorWidget.border": "#E4DCC8",
      },
    });

    monacoInstance.editor.setTheme("texly-ink-theme");

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
  };

  // Update error markers when log changes
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    if (compileLog && compileLog.includes("Error")) {
      const markers = parseErrorMarkers(compileLog);
      monacoRef.current.editor.setModelMarkers(model, "latex", markers);
    } else {
      monacoRef.current.editor.setModelMarkers(model, "latex", []);
    }
  }, [compileLog]);

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={(v) => onChange(v || "")}
      onMount={handleMount}
      options={{
        theme: "texly-ink-theme",
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
      }}
    />
  );
}

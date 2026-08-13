"use client";
import React, { useState, useEffect } from "react";
import { IconCompile } from "../icons";

interface Props {
  onCompile: () => void;
  status: "idle" | "compiling" | "success" | "error";
  disabled?: boolean;
}

export default function WaxSealButton({ onCompile, status, disabled = false }: Props) {
  const [lastResult, setLastResult] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    if (status === "success" || status === "error") {
      setLastResult(status);
      const timer = setTimeout(() => {
        setLastResult(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const isCompiling = status === "compiling";

  return (
    <button
      className={`btn-seal ${isCompiling ? "compiling" : ""}`}
      onClick={onCompile}
      disabled={disabled || isCompiling}
      aria-label="Compile document"
      title="Compile document (Ctrl+Enter)"
    >
      <IconCompile size={20} strokeWidth={2.2} />

      {/* Badge feedback on edge */}
      {lastResult === "success" && (
        <span className="seal-badge seal-badge-success" title="Compile successful">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </span>
      )}
      {lastResult === "error" && (
        <span className="seal-badge seal-badge-error" title="Compile failed">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="12" y1="19" x2="12.01" y2="19"/></svg>
        </span>
      )}
    </button>
  );
}

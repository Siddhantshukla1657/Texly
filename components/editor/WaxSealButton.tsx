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
          ✓
        </span>
      )}
      {lastResult === "error" && (
        <span className="seal-badge seal-badge-error" title="Compile failed">
          !
        </span>
      )}
    </button>
  );
}

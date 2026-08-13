"use client";
import React, { useState, useEffect, useCallback } from "react";

interface Props {
  leftWidth: number; // percentage or px
  onResize: (newWidth: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  children?: React.ReactNode; // e.g. Wax Seal Button anchored on the seam
}

export default function StitchedSeamDivider({ onResize, containerRef, children }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleTouchStart = () => {
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      // Clamp between 20% and 80%
      const clampedWidth = Math.min(Math.max(newWidth, 20), 80);
      onResize(clampedWidth);
    },
    [isDragging, containerRef, onResize]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", (e) => {
        if (e.touches[0]) {
          handleMouseMove(e.touches[0] as unknown as MouseEvent);
        }
      });
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      onResize(-2); // relative change handled by parent or pass current width
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      onResize(2);
    }
  };

  return (
    <div
      tabIndex={0}
      role="separator"
      aria-label="Editor and Preview resizable seam divider"
      aria-orientation="vertical"
      className={`stitched-seam ${isDragging ? "dragging" : ""}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Anchored Wax Seal or custom elements */}
      {children}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

const WORKING_MAX_DIM = 2000;

type Rect = { x: number; y: number; w: number; h: number };

export default function PhotoCropper({
  file,
  onConfirm,
  onSkip,
}: {
  file: File;
  onConfirm: (cropped: Blob) => void;
  onSkip: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [rect, setRect] = useState<Rect | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const scale = Math.min(1, WORKING_MAX_DIM / Math.max(img.width, img.height));
      setCanvasSize({ w: Math.round(img.width * scale), h: Math.round(img.height * scale) });
      setImgEl(img);
    };
    img.src = url;
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgEl || canvasSize.w === 0) return;
    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(imgEl, 0, 0, canvasSize.w, canvasSize.h);
    if (rect) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, canvasSize.w, rect.y);
      ctx.fillRect(0, rect.y, rect.x, rect.h);
      ctx.fillRect(rect.x + rect.w, rect.y, canvasSize.w - rect.x - rect.w, rect.h);
      ctx.fillRect(0, rect.y + rect.h, canvasSize.w, canvasSize.h - rect.y - rect.h);
      ctx.strokeStyle = "#e4c578";
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
  }, [imgEl, canvasSize, rect]);

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const bounds = canvas.getBoundingClientRect();
    const scaleX = canvas.width / bounds.width;
    const scaleY = canvas.height / bounds.height;
    return {
      x: (e.clientX - bounds.left) * scaleX,
      y: (e.clientY - bounds.top) * scaleY,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointFromEvent(e);
    dragStart.current = p;
    setRect({ x: p.x, y: p.y, w: 0, h: 0 });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragStart.current) return;
    const p = pointFromEvent(e);
    const start = dragStart.current;
    const x = Math.max(0, Math.min(start.x, p.x));
    const y = Math.max(0, Math.min(start.y, p.y));
    const w = Math.min(canvasSize.w, Math.max(start.x, p.x)) - x;
    const h = Math.min(canvasSize.h, Math.max(start.y, p.y)) - y;
    setRect({ x, y, w, h });
  }

  function handlePointerUp() {
    dragStart.current = null;
  }

  function confirmCrop() {
    if (!rect || !imgEl) return;
    const minDim = Math.min(canvasSize.w, canvasSize.h) * 0.1;
    if (rect.w < minDim || rect.h < minDim) return; // ignore accidental taps
    const out = document.createElement("canvas");
    out.width = Math.round(rect.w);
    out.height = Math.round(rect.h);
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(canvasRef.current!, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    out.toBlob((blob) => blob && onConfirm(blob), "image/jpeg", 0.9);
  }

  return (
    <div>
      <p style={{ color: "var(--ivory-dim)", fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
        If this photo shows other people, or was taken from a distance (like a wedding or event
        shot), drag a box around just your head so we can read the detail clearly.
      </p>
      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
          background: "var(--panel)",
          touchAction: "none",
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ width: "100%", height: "auto", display: "block", cursor: "crosshair" }}
        />
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="btn btn-gold" disabled={!rect || rect.w < 10} onClick={confirmCrop}>
          Confirm crop
        </button>
        <button className="btn" onClick={onSkip}>
          Skip — this is already just me
        </button>
      </div>
    </div>
  );
}

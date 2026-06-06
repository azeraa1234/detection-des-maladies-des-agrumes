import { useEffect, useRef, useState } from "react";
import { DISEASE_COLORS, type Detection } from "@/lib/mock-data";

interface Props {
  imageSrc: string;
  detections: Detection[];
}

export function BoundingBoxCanvas({ imageSrc, detections }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      const img = imgRef.current;
      if (!canvas || !img || !img.complete) return;
      const rect = img.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      detections.forEach((d) => {
        const color = DISEASE_COLORS[d.class as keyof typeof DISEASE_COLORS] || "#22C55E";
        const [cx, cy, bw, bh] = d.bbox;
        const x = (cx - bw / 2) * rect.width;
        const y = (cy - bh / 2) * rect.height;
        const w = bw * rect.width;
        const h = bh * rect.height;

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.strokeRect(x, y, w, h);
        ctx.shadowBlur = 0;

        const label = `${d.class} ${Math.round(d.confidence * 100)}%`;
        ctx.font = "600 12px Inter, sans-serif";
        const textW = ctx.measureText(label).width;
        const padX = 8;
        const padY = 5;
        const pillW = textW + padX * 2;
        const pillH = 22;
        const pillX = x;
        const pillY = Math.max(0, y - pillH - 2);
        ctx.fillStyle = color;
        const r = 6;
        ctx.beginPath();
        ctx.moveTo(pillX + r, pillY);
        ctx.arcTo(pillX + pillW, pillY, pillX + pillW, pillY + pillH, r);
        ctx.arcTo(pillX + pillW, pillY + pillH, pillX, pillY + pillH, r);
        ctx.arcTo(pillX, pillY + pillH, pillX, pillY, r);
        ctx.arcTo(pillX, pillY, pillX + pillW, pillY, r);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#0b0f0d";
        ctx.fillText(label, pillX + padX, pillY + pillH - padY - 1);
      });
    };

    draw();
    const ro = new ResizeObserver(draw);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", draw);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", draw);
    };
  }, [imageSrc, detections, ready]);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl border border-border bg-black/40">
      <img
        ref={imgRef}
        src={imageSrc}
        alt="Analyse"
        crossOrigin="anonymous"
        onLoad={() => setReady(true)}
        className="block h-auto w-full"
      />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />
    </div>
  );
}
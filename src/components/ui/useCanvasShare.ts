"use client";

import { useRef, useState } from "react";

export function useCanvasShare({ fileName, shareTitle }: { fileName: string; shareTitle: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function generateAndShare(draw: (ctx: CanvasRenderingContext2D) => void) {
    setIsGenerating(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      draw(ctx);

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;

      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: shareTitle });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsGenerating(false);
    }
  }

  return { canvasRef, isGenerating, generateAndShare };
}

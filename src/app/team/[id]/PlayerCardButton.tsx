"use client";

import { useRef, useState } from "react";

type PlayerCardData = {
  name: string;
  shirtNumber: number | null;
  position: string | null;
  goals: number;
  assists: number;
  matchesPlayed: number;
  badgeCount: number;
};

const WIDTH = 1080;
const HEIGHT = 1350;
const NAVY = "#1c3762";
const GOLD = "#e8b53a";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawCard(ctx: CanvasRenderingContext2D, player: PlayerCardData) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.textAlign = "center";

  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#142a4d");
  gradient.addColorStop(1, NAVY);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 8;
  ctx.strokeRect(24, 24, WIDTH - 48, HEIGHT - 48);

  ctx.fillStyle = GOLD;
  ctx.font = "700 36px sans-serif";
  ctx.fillText("CHARENTON FC", WIDTH / 2, 130);

  ctx.beginPath();
  ctx.arc(WIDTH / 2, 400, 160, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(232,181,58,0.12)";
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = GOLD;
  ctx.stroke();

  ctx.fillStyle = GOLD;
  ctx.font = "700 170px sans-serif";
  ctx.fillText(player.shirtNumber != null ? `${player.shirtNumber}` : "?", WIDTH / 2, 460);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 60px sans-serif";
  ctx.fillText(player.name, WIDTH / 2, 660);

  if (player.position) {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "400 32px sans-serif";
    ctx.fillText(player.position, WIDTH / 2, 710);
  }

  const stats = [
    { label: "BUTS", value: player.goals },
    { label: "PASSES D.", value: player.assists },
    { label: "MATCHS", value: player.matchesPlayed },
  ];
  const statY = 880;
  const boxWidth = 280;
  const gap = 30;
  const totalWidth = stats.length * boxWidth + (stats.length - 1) * gap;
  let x = (WIDTH - totalWidth) / 2;
  for (const s of stats) {
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundRect(ctx, x, statY, boxWidth, 160, 24);
    ctx.fill();

    ctx.fillStyle = GOLD;
    ctx.font = "700 72px sans-serif";
    ctx.fillText(`${s.value}`, x + boxWidth / 2, statY + 90);

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "700 24px sans-serif";
    ctx.fillText(s.label, x + boxWidth / 2, statY + 130);

    x += boxWidth + gap;
  }

  if (player.badgeCount > 0) {
    ctx.fillStyle = GOLD;
    ctx.font = "600 34px sans-serif";
    ctx.fillText(
      `${player.badgeCount} badge${player.badgeCount > 1 ? "s" : ""} débloqué${player.badgeCount > 1 ? "s" : ""}`,
      WIDTH / 2,
      1130
    );
  }

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "400 26px sans-serif";
  ctx.fillText("charenton-fc.vercel.app", WIDTH / 2, HEIGHT - 60);
}

export function PlayerCardButton({ player }: { player: PlayerCardData }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function generateAndShare() {
    setIsGenerating(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      drawCard(ctx, player);

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;

      const fileName = `${player.name.replace(/\s+/g, "-")}-charenton-fc.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${player.name} — Charenton FC` });
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

  return (
    <>
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="hidden" />
      <button
        type="button"
        onClick={generateAndShare}
        disabled={isGenerating}
        className="rounded-full border border-navy/20 px-3 py-1.5 text-xs font-medium text-navy/70 disabled:opacity-60"
      >
        {isGenerating ? "Génération…" : "Carte joueur"}
      </button>
    </>
  );
}

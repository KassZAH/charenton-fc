"use client";

import { useCanvasShare } from "@/components/ui/useCanvasShare";
import { roundRect, drawBrandedBackground, drawHeader, drawFooter, CANVAS_GOLD } from "@/lib/canvas-draw";

type CareerCardData = {
  name: string;
  shirtNumber: number | null;
  position: string | null;
  goals: number;
  assists: number;
  matchesPlayed: number;
  trophyCount: number;
  badgeCount: number;
};

const WIDTH = 1080;
const HEIGHT = 1350;

function drawCard(ctx: CanvasRenderingContext2D, player: CareerCardData) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBrandedBackground(ctx, WIDTH, HEIGHT);
  drawHeader(ctx, WIDTH, 130, "CARRIÈRE — CHARENTON FC");

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 64px sans-serif";
  ctx.fillText(player.name, WIDTH / 2, 260);

  const subtitle = [player.shirtNumber != null ? `#${player.shirtNumber}` : null, player.position]
    .filter(Boolean)
    .join(" · ");
  if (subtitle) {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "400 32px sans-serif";
    ctx.fillText(subtitle, WIDTH / 2, 310);
  }

  const stats = [
    { label: "BUTS", value: player.goals },
    { label: "PASSES D.", value: player.assists },
    { label: "MATCHS", value: player.matchesPlayed },
  ];
  const statY = 420;
  const boxWidth = 280;
  const gap = 30;
  let x = (WIDTH - (stats.length * boxWidth + (stats.length - 1) * gap)) / 2;
  for (const s of stats) {
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundRect(ctx, x, statY, boxWidth, 160, 24);
    ctx.fill();
    ctx.fillStyle = CANVAS_GOLD;
    ctx.font = "700 72px sans-serif";
    ctx.fillText(`${s.value}`, x + boxWidth / 2, statY + 90);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "700 24px sans-serif";
    ctx.fillText(s.label, x + boxWidth / 2, statY + 130);
    x += boxWidth + gap;
  }

  ctx.fillStyle = CANVAS_GOLD;
  ctx.font = "700 48px sans-serif";
  ctx.fillText(`🏆 ${player.trophyCount} récompense${player.trophyCount > 1 ? "s" : ""} de match`, WIDTH / 2, 780);

  if (player.badgeCount > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "500 34px sans-serif";
    ctx.fillText(`${player.badgeCount} badge${player.badgeCount > 1 ? "s" : ""} débloqué${player.badgeCount > 1 ? "s" : ""}`, WIDTH / 2, 850);
  }

  drawFooter(ctx, WIDTH, HEIGHT);
}

export function CareerCardButton({ player }: { player: CareerCardData }) {
  const { canvasRef, isGenerating, generateAndShare } = useCanvasShare({
    fileName: `${player.name.replace(/\s+/g, "-")}-carriere-charenton-fc.png`,
    shareTitle: `${player.name} — Carrière Charenton FC`,
  });

  return (
    <>
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="hidden" />
      <button
        type="button"
        onClick={() => generateAndShare((ctx) => drawCard(ctx, player))}
        disabled={isGenerating}
        className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-cream/80 disabled:opacity-60"
      >
        {isGenerating ? "Génération…" : "Carte carrière"}
      </button>
    </>
  );
}

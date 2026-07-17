"use client";

import { useCanvasShare } from "@/components/ui/useCanvasShare";
import { Button } from "@/components/ui/Button";
import { drawBrandedBackground, drawHeader, drawFooter, CANVAS_GOLD } from "@/lib/canvas-draw";

const WIDTH = 1080;
const HEIGHT = 1350;

export type MatchPosterData = {
  isHome: boolean;
  opponentLabel: string;
  dateLabel: string;
  timeLabel: string | null;
  location: string | null;
};

function draw(ctx: CanvasRenderingContext2D, data: MatchPosterData) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBrandedBackground(ctx, WIDTH, HEIGHT);
  drawHeader(ctx, WIDTH, 130, "CHARENTON FC");

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "700 30px sans-serif";
  ctx.fillText("PROCHAIN MATCH", WIDTH / 2, 320);

  const home = data.isHome ? "Charenton FC" : data.opponentLabel;
  const away = data.isHome ? data.opponentLabel : "Charenton FC";

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 62px sans-serif";
  ctx.fillText(home, WIDTH / 2, 440);

  ctx.fillStyle = CANVAS_GOLD;
  ctx.font = "700 40px sans-serif";
  ctx.fillText("VS", WIDTH / 2, 540);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 62px sans-serif";
  ctx.fillText(away, WIDTH / 2, 630);

  const details = [data.dateLabel, data.timeLabel, data.location].filter(
    (v): v is string => !!v
  );
  let y = 820;
  for (const line of details) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "500 38px sans-serif";
    ctx.fillText(line, WIDTH / 2, y);
    y += 70;
  }

  drawFooter(ctx, WIDTH, HEIGHT);
}

export function MatchPosterButton({ data }: { data: MatchPosterData }) {
  const { canvasRef, isGenerating, generateAndShare } = useCanvasShare({
    fileName: "prochain-match-charenton-fc.png",
    shareTitle: "Prochain match — Charenton FC",
  });

  return (
    <>
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="hidden" />
      <Button
        type="button"
        variant="secondary"
        disabled={isGenerating}
        onClick={() => generateAndShare((ctx) => draw(ctx, data))}
      >
        {isGenerating ? "Génération…" : "Affiche du match"}
      </Button>
    </>
  );
}

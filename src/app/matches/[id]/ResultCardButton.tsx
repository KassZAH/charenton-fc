"use client";

import { useCanvasShare } from "@/components/ui/useCanvasShare";
import { Button } from "@/components/ui/Button";
import { drawBrandedBackground, drawHeader, drawFooter, roundRect, CANVAS_GOLD } from "@/lib/canvas-draw";

const WIDTH = 1080;
const HEIGHT = 1350;

export type ResultCardData = {
  isHome: boolean;
  opponentLabel: string;
  teamScore: number;
  opponentScore: number;
  scorers: string[];
  assists: string[];
  awards: { emoji: string | null; name: string; winner: string }[];
  streakLabel: string | null;
};

function draw(ctx: CanvasRenderingContext2D, data: ResultCardData) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBrandedBackground(ctx, WIDTH, HEIGHT);
  drawHeader(ctx, WIDTH, 120, "RÉSULTAT");

  ctx.textAlign = "center";
  const home = data.isHome ? "Charenton FC" : data.opponentLabel;
  const away = data.isHome ? data.opponentLabel : "Charenton FC";
  const homeScore = data.isHome ? data.teamScore : data.opponentScore;
  const awayScore = data.isHome ? data.opponentScore : data.teamScore;

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 42px sans-serif";
  ctx.fillText(home, WIDTH / 2, 250);

  ctx.fillStyle = CANVAS_GOLD;
  ctx.font = "700 160px sans-serif";
  ctx.fillText(`${homeScore} – ${awayScore}`, WIDTH / 2, 400);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 42px sans-serif";
  ctx.fillText(away, WIDTH / 2, 470);

  let y = 600;
  const section = (title: string, lines: string[]) => {
    if (lines.length === 0) return;
    ctx.fillStyle = CANVAS_GOLD;
    ctx.font = "700 32px sans-serif";
    ctx.fillText(title, WIDTH / 2, y);
    y += 50;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "500 34px sans-serif";
    for (const line of lines) {
      ctx.fillText(line, WIDTH / 2, y);
      y += 46;
    }
    y += 30;
  };

  section("BUTEURS", data.scorers);
  section("PASSES DÉCISIVES", data.assists);
  section(
    "RÉCOMPENSES",
    data.awards.map((a) => `${a.emoji ?? ""} ${a.name} : ${a.winner}`.trim())
  );

  if (data.streakLabel) {
    roundRect(ctx, WIDTH / 2 - 260, HEIGHT - 220, 520, 90, 20);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    ctx.fillStyle = CANVAS_GOLD;
    ctx.font = "700 30px sans-serif";
    ctx.fillText(data.streakLabel, WIDTH / 2, HEIGHT - 165);
  }

  drawFooter(ctx, WIDTH, HEIGHT);
}

export function ResultCardButton({ data }: { data: ResultCardData }) {
  const { canvasRef, isGenerating, generateAndShare } = useCanvasShare({
    fileName: "resultat-charenton-fc.png",
    shareTitle: "Résultat — Charenton FC",
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
        {isGenerating ? "Génération…" : "Carte résultat"}
      </Button>
    </>
  );
}

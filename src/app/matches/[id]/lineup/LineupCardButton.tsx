"use client";

import { useCanvasShare } from "@/components/ui/useCanvasShare";
import { Button } from "@/components/ui/Button";
import { drawHeader, drawFooter, roundRect, CANVAS_NAVY_DEEP, CANVAS_GOLD } from "@/lib/canvas-draw";
import type { FormationSlot } from "@/lib/formations";

const WIDTH = 1080;
const HEIGHT = 1350;
const PITCH_TOP = 260;
const PITCH_BOTTOM = 1220;
const PITCH_LEFT = 60;
const PITCH_RIGHT = WIDTH - 60;

export type LineupCardData = {
  opponentLabel: string;
  formationLabel: string;
  slots: FormationSlot[];
  playerNameBySlotKey: Record<string, string | null>;
};

function draw(ctx: CanvasRenderingContext2D, data: LineupCardData) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = CANVAS_NAVY_DEEP;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawHeader(ctx, WIDTH, 100, "COMPOSITION");
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "500 34px sans-serif";
  ctx.fillText(`vs ${data.opponentLabel} — ${data.formationLabel}`, WIDTH / 2, 160);

  // Terrain
  const pitchW = PITCH_RIGHT - PITCH_LEFT;
  const pitchH = PITCH_BOTTOM - PITCH_TOP;
  roundRect(ctx, PITCH_LEFT, PITCH_TOP, pitchW, pitchH, 24);
  ctx.fillStyle = "#0d3d24";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 3;
  ctx.strokeRect(PITCH_LEFT + 30, PITCH_TOP + 30, pitchW - 60, pitchH - 60);
  ctx.beginPath();
  ctx.moveTo(PITCH_LEFT + 30, PITCH_TOP + pitchH / 2);
  ctx.lineTo(PITCH_RIGHT - 30, PITCH_TOP + pitchH / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(WIDTH / 2, PITCH_TOP + pitchH / 2, 90, 0, Math.PI * 2);
  ctx.stroke();

  for (const slot of data.slots) {
    const name = data.playerNameBySlotKey[slot.key];
    const x = PITCH_LEFT + (slot.x / 100) * pitchW;
    const y = PITCH_TOP + (slot.y / 100) * pitchH;

    ctx.beginPath();
    ctx.arc(x, y, 44, 0, Math.PI * 2);
    ctx.fillStyle = name ? CANVAS_GOLD : "rgba(255,255,255,0.15)";
    ctx.fill();

    if (name) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 26px sans-serif";
      ctx.textAlign = "center";
      const short = name.length > 10 ? `${name.slice(0, 9)}…` : name;
      ctx.fillText(short, x, y + 70, 160);
    }
  }

  drawFooter(ctx, WIDTH, HEIGHT);
}

export function LineupCardButton({ data }: { data: LineupCardData }) {
  const { canvasRef, isGenerating, generateAndShare } = useCanvasShare({
    fileName: "composition-charenton-fc.png",
    shareTitle: "Composition — Charenton FC",
  });

  return (
    <>
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="hidden" />
      <Button
        type="button"
        variant="secondary"
        shape="block"
        disabled={isGenerating}
        onClick={() => generateAndShare((ctx) => draw(ctx, data))}
      >
        {isGenerating ? "Génération…" : "Carte de composition"}
      </Button>
    </>
  );
}

export const CANVAS_NAVY = "#142a4f";
export const CANVAS_NAVY_DEEP = "#0c1a33";
export const CANVAS_GOLD = "#f0b93a";

export function roundRect(
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

export function drawBrandedBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#16294d");
  gradient.addColorStop(1, CANVAS_NAVY_DEEP);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = CANVAS_GOLD;
  ctx.lineWidth = 8;
  ctx.strokeRect(24, 24, width - 48, height - 48);
}

export function drawHeader(ctx: CanvasRenderingContext2D, width: number, y: number, text: string) {
  ctx.textAlign = "center";
  ctx.fillStyle = CANVAS_GOLD;
  ctx.font = "700 36px sans-serif";
  ctx.fillText(text, width / 2, y);
}

export function drawFooter(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "400 26px sans-serif";
  ctx.fillText("charenton-fc.vercel.app", width / 2, height - 60);
}

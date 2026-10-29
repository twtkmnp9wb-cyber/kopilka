// Рисунок сувенирной купюры «Копилки» на canvas. Это собственный дизайн, а не копия
// настоящих денег: другой номинал-«билет», явная надпись «сувенир», выдуманные серии.
// Одни и те же функции рисуют текстуры для 3D-модели и статичную картинку-заглушку.

export const NOTE_ASPECT = 16 / 7;

const INK = '#2d2470';
const VIOLET = '#6250d6';
const TEAL = '#1a9c74';
const CORAL = '#e2552f';
const FONT = "'Inter Variable', system-ui, -apple-system, 'Segoe UI', sans-serif";

type Ctx = CanvasRenderingContext2D;

function roundedRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Детерминированный шум: «волокна» бумаги одинаковые при каждой отрисовке. */
function fibers(ctx: Ctx, w: number, h: number, color: string, seed: number) {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (let i = 0; i < 900; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    const angle = rand() * Math.PI;
    const length = 4 + rand() * 12;
    ctx.globalAlpha = 0.05 + rand() * 0.08;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
  }
  ctx.restore();
}

/** Волнистые линии гильоша по всей площади — главный «денежный» мотив. */
function guillocheWaves(ctx: Ctx, w: number, h: number, color: string, phase: number) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  const lines = 46;
  for (let i = 0; i < lines; i += 1) {
    const base = (i / (lines - 1)) * h;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 6) {
      const y =
        base +
        Math.sin(x * 0.011 + i * 0.35 + phase) * 9 +
        Math.sin(x * 0.0035 + i * 0.9 + phase * 2) * 16;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Розетка: множество повёрнутых эллипсов — узор, который сложно подделать вручную. */
function rosette(ctx: Ctx, cx: number, cy: number, radius: number, colors: readonly string[]) {
  ctx.save();
  ctx.translate(cx, cy);
  colors.forEach((color, layer) => {
    const count = 40 - layer * 8;
    const r = radius * (1 - layer * 0.22);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.3;
    for (let k = 0; k < count; k += 1) {
      ctx.save();
      ctx.rotate((k / count) * Math.PI + layer * 0.2);
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * (0.36 + layer * 0.08), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  });
  ctx.restore();
}

function textOnCircle(
  ctx: Ctx,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  size: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.font = `600 ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chars = [...text];
  const step = (Math.PI * 2) / chars.length;
  chars.forEach((char, i) => {
    ctx.save();
    ctx.rotate(i * step - Math.PI / 2);
    ctx.translate(0, -radius);
    ctx.fillText(char, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

/** Силуэт копилки-свинки: тело, ухо, пятачок, ножки и прорезь для монет. */
export function drawPiggy(ctx: Ctx, cx: number, cy: number, size: number, mode: 'fill' | 'stroke') {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineWidth = size * 0.035;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const paint = () => (mode === 'fill' ? ctx.fill() : ctx.stroke());

  // ножки
  for (const dx of [-0.32, -0.12, 0.14, 0.32]) {
    ctx.beginPath();
    roundedRect(ctx, dx * size - size * 0.06, size * 0.22, size * 0.12, size * 0.2, size * 0.04);
    paint();
  }
  // тело
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.5, size * 0.36, 0, 0, Math.PI * 2);
  paint();
  // ухо
  ctx.beginPath();
  ctx.moveTo(size * 0.16, -size * 0.3);
  ctx.lineTo(size * 0.3, -size * 0.52);
  ctx.lineTo(size * 0.38, -size * 0.24);
  ctx.closePath();
  paint();
  // пятачок
  ctx.beginPath();
  ctx.ellipse(size * 0.52, size * 0.02, size * 0.1, size * 0.13, 0, 0, Math.PI * 2);
  paint();
  // хвостик
  ctx.beginPath();
  ctx.moveTo(-size * 0.5, -size * 0.02);
  ctx.bezierCurveTo(
    -size * 0.66,
    -size * 0.12,
    -size * 0.6,
    -size * 0.28,
    -size * 0.7,
    -size * 0.24,
  );
  ctx.stroke();

  if (mode === 'stroke') {
    // прорезь и глаз
    ctx.beginPath();
    ctx.moveTo(-size * 0.12, -size * 0.28);
    ctx.lineTo(size * 0.08, -size * 0.28);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(size * 0.3, -size * 0.08, size * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function frame(ctx: Ctx, w: number, h: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = 4;
  roundedRect(ctx, 34, 34, w - 68, h - 68, 26);
  ctx.stroke();
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1.5;
  roundedRect(ctx, 54, 54, w - 108, h - 108, 16);
  ctx.stroke();
  // «верёвочка» между рамками
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 1.2;
  const step = 18;
  for (let x = 60; x < w - 60; x += step) {
    ctx.beginPath();
    ctx.arc(x, 44, 6, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, h - 44, 6, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function microtext(ctx: Ctx, w: number, y: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.55;
  ctx.font = `600 15px ${FONT}`;
  ctx.textBaseline = 'middle';
  const chunk = 'СУВЕНИР · НЕ ЯВЛЯЕТСЯ ПЛАТЁЖНЫМ СРЕДСТВОМ · КОПИЛКА · ';
  let text = chunk;
  while (ctx.measureText(text).width < w - 160) text += chunk;
  ctx.fillText(text, 80, y, w - 160);
  ctx.restore();
}

function denomination(ctx: Ctx, x: number, y: number, size: number, align: CanvasTextAlign) {
  ctx.save();
  const gradient = ctx.createLinearGradient(x - size * 2, y - size, x + size * 2, y);
  gradient.addColorStop(0, VIOLET);
  gradient.addColorStop(1, TEAL);
  ctx.fillStyle = gradient;
  ctx.font = `800 ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('5000', x, y);
  ctx.restore();
}

/** Голографическая полоса: на лицевой стороне видна как переливающаяся вертикальная лента. */
export const HOLO_STRIPE = { from: 0.395, to: 0.44 } as const;

export function drawBanknoteFront(ctx: Ctx, w: number, h: number) {
  const paper = ctx.createLinearGradient(0, 0, w, h);
  paper.addColorStop(0, '#ece6ff');
  paper.addColorStop(0.55, '#e4f0ff');
  paper.addColorStop(1, '#dcf3ea');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.2, h * 0.5, 0, w * 0.2, h * 0.5, h * 0.7);
  glow.addColorStop(0, 'rgba(255,255,255,0.75)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  fibers(ctx, w, h, VIOLET, 7);
  guillocheWaves(ctx, w, h, 'rgba(98, 80, 214, 0.09)', 0);

  // Левая розетка с крупным знаком рубля и круговой надписью.
  const rx = w * 0.2;
  const ry = h * 0.5;
  rosette(ctx, rx, ry, h * 0.34, [
    'rgba(98,80,214,0.28)',
    'rgba(26,156,116,0.26)',
    'rgba(226,85,47,0.18)',
  ]);
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.beginPath();
  ctx.arc(rx, ry, h * 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.fillStyle = INK;
  ctx.font = `800 ${h * 0.24}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('₽', rx, ry + h * 0.01);
  ctx.fillStyle = VIOLET;
  textOnCircle(ctx, 'КОПИЛКА · БИЛЕТ ОСОЗНАННЫХ НАКОПЛЕНИЙ · ', rx, ry, h * 0.205, h * 0.026);
  ctx.restore();

  // Голографическая полоса.
  const sx = w * HOLO_STRIPE.from;
  const sw = w * (HOLO_STRIPE.to - HOLO_STRIPE.from);
  const holo = ctx.createLinearGradient(0, 0, 0, h);
  ['#ffd6e8', '#d6e4ff', '#d5fff1', '#fff3c9', '#e9d6ff', '#ffd6e8'].forEach((color, i, all) =>
    holo.addColorStop(i / (all.length - 1), color),
  );
  ctx.fillStyle = holo;
  ctx.fillRect(sx, 0, sw, h);
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `800 ${sw * 0.62}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let y = sw * 0.6; y < h; y += sw * 1.05) ctx.fillText('₽', sx + sw / 2, y);
  ctx.restore();

  // Водяной знак: светлое поле и полупрозрачная копилка.
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(w * 0.565, h * 0.38, h * 0.16, h * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(98, 80, 214, 0.16)';
  drawPiggy(ctx, w * 0.565, h * 0.4, h * 0.19, 'fill');
  ctx.restore();

  // Номинал: крупно справа сверху и мелко в углу.
  denomination(ctx, w * 0.905, h * 0.4, h * 0.22, 'right');
  ctx.save();
  ctx.fillStyle = INK;
  ctx.globalAlpha = 0.75;
  ctx.font = `600 ${h * 0.034}px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('пять тысяч рублей на мечту', w * 0.9, h * 0.48);
  ctx.restore();
  denomination(ctx, w * 0.085, h * 0.17, h * 0.07, 'left');

  // Название внизу по центру.
  ctx.save();
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.font = `800 ${h * 0.095}px ${FONT}`;
  ctx.fillText('КОПИЛКА', w * 0.475, h * 0.7);
  ctx.fillStyle = VIOLET;
  ctx.font = `600 ${h * 0.03}px ${FONT}`;
  ctx.fillText('БИЛЕТ ОСОЗНАННЫХ НАКОПЛЕНИЙ', w * 0.478, h * 0.765);
  ctx.restore();

  // Серийные номера.
  ctx.save();
  ctx.fillStyle = CORAL;
  ctx.font = `700 ${h * 0.042}px ui-monospace, 'SF Mono', Menlo, monospace`;
  ctx.textAlign = 'right';
  ctx.fillText('КП 0 001 337', w * 0.9, h * 0.7);
  ctx.fillText('КП 0 001 337', w * 0.9, h * 0.2);
  ctx.restore();

  frame(ctx, w, h, VIOLET);
  microtext(ctx, w, h - 70, INK);
}

export function drawBanknoteBack(ctx: Ctx, w: number, h: number) {
  const paper = ctx.createLinearGradient(0, h, w, 0);
  paper.addColorStop(0, '#dcf3ea');
  paper.addColorStop(0.5, '#eef6e8');
  paper.addColorStop(1, '#ffe9df');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, w, h);

  fibers(ctx, w, h, TEAL, 13);
  guillocheWaves(ctx, w, h, 'rgba(26, 156, 116, 0.1)', 1.7);
  rosette(ctx, w * 0.32, h * 0.52, h * 0.42, ['rgba(26,156,116,0.2)', 'rgba(98,80,214,0.16)']);

  // Иллюстрация: копилка и падающая монета.
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(w * 0.32, h * 0.54, h * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  drawPiggy(ctx, w * 0.31, h * 0.6, h * 0.42, 'stroke');
  ctx.fillStyle = '#f2b637';
  ctx.strokeStyle = '#b07d10';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(w * 0.3, h * 0.25, h * 0.06, h * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7a5306';
  ctx.font = `800 ${h * 0.07}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('₽', w * 0.3, h * 0.255);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.font = `800 ${h * 0.1}px ${FONT}`;
  ctx.fillText('КОПИ', w * 0.58, h * 0.42);
  ctx.fillText('ОСОЗНАННО', w * 0.58, h * 0.54);
  ctx.fillStyle = TEAL;
  ctx.font = `600 ${h * 0.034}px ${FONT}`;
  ctx.fillText('доходы · расходы · цели · прогноз', w * 0.582, h * 0.62);
  ctx.restore();

  denomination(ctx, w * 0.915, h * 0.2, h * 0.08, 'right');
  denomination(ctx, w * 0.085, h * 0.86, h * 0.08, 'left');

  frame(ctx, w, h, TEAL);
  microtext(ctx, w, 70, INK);
}

/**
 * Карта свойств материала (одна текстура на три канала):
 * R — сила иридесценции, G — шероховатость, B — металличность.
 * Бумага матовая, голографическая полоса гладкая и переливается.
 */
export function drawMaterialMask(ctx: Ctx, w: number, h: number) {
  ctx.fillStyle = 'rgb(0, 214, 0)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgb(255, 70, 110)';
  ctx.fillRect(w * HOLO_STRIPE.from, 0, w * (HOLO_STRIPE.to - HOLO_STRIPE.from), h);
}

export function createCanvas(width: number, draw: (ctx: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.round(width / NOTE_ASPECT);
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx, canvas.width, canvas.height);
  return canvas;
}

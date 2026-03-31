/**
 * GLYPH — Draw a single 6-bit symbol onto a canvas context.
 *
 * Bit layout per glyph (6 bits total):
 *   [0-1] shape:    00=circle  01=square  10=triangle  11=diamond
 *   [2-3] rotation: 00=0°  01=90°  10=180°  11=270°
 *   [4-5] fill:     00=solid  01=heavy  10=medium  11=outline
 *
 * 4 shapes × 4 rotations × 4 fills = 64 distinct states → 6 bits/cell ✓
 *
 * The fill encoding maps to pixel density on scan:
 *   solid   → >60% black  (classifyCell returns '00')
 *   heavy   → >40% black  (classifyCell returns '01')
 *   medium  → >20% black  (classifyCell returns '10')
 *   outline → <20% black  (classifyCell returns '11')
 *
 * This matches classifyCell() in scan/classify.js exactly.
 */

export function drawGlyph(ctx, bits6, x, y, size) {
  const shape = bits6.substr(0, 2);  // 00–11
  const rot   = parseInt(bits6.substr(2, 2), 2); // 0–3
  const fill  = bits6.substr(4, 2);  // 00–11

  const cx = x + size / 2;
  const cy = y + size / 2;
  const r  = size * 0.38; // glyph radius (leaves padding between cells)

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot * Math.PI / 2);

  // Configure fill/stroke based on fill encoding
  ctx.lineWidth = size * 0.08;
  ctx.strokeStyle = '#111';
  ctx.fillStyle   = '#111';

  ctx.beginPath();

  // Draw shape path
  switch (shape) {
    case '00': // Circle
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      break;
    case '01': // Square
      ctx.rect(-r, -r, r * 2, r * 2);
      break;
    case '10': // Triangle (equilateral, pointing up before rotation)
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.866, r * 0.5);
      ctx.lineTo(-r * 0.866, r * 0.5);
      ctx.closePath();
      break;
    case '11': // Diamond
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      break;
  }

  // Apply fill style
  switch (fill) {
    case '00': // Solid — >60% pixel density
      ctx.fill();
      break;
    case '01': // Heavy — 40-60% density: filled + thick border gap
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = size * 0.12;
      ctx.stroke(); // carve ring to reduce density
      ctx.restore();
      break;
    case '10': // Medium — 20-40% density: outline with thick stroke
      ctx.lineWidth = size * 0.18;
      ctx.stroke();
      break;
    case '11': // Outline — <20% density: thin outline only
      ctx.lineWidth = size * 0.07;
      ctx.stroke();
      break;
  }

  ctx.restore();
}

/**
 * Draw a finder pattern — a large bold square used to locate the code
 * in the camera feed. Drawn at corners of the glyph grid.
 * Finder patterns are NOT data-bearing; they help the scanner orient itself.
 */
export function drawFinder(ctx, x, y, size) {
  ctx.save();
  ctx.fillStyle = '#111';
  // Outer square
  ctx.fillRect(x, y, size, size);
  // White inner
  const inset = size * 0.2;
  ctx.fillStyle = 'white';
  ctx.fillRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
  // Black center
  ctx.fillStyle = '#111';
  const inset2 = size * 0.4;
  ctx.fillRect(x + inset2, y + inset2, size - inset2 * 2, size - inset2 * 2);
  ctx.restore();
}

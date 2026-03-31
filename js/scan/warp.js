/**
 * WARP — Perspective-correct a detected GlyphCode to a square canvas
 *
 * Given 3 finder pattern centroids (top-left, top-right, bottom-left),
 * infer the 4th corner (bottom-right) and crop/scale the region to a
 * fixed-size square for consistent grid classification.
 *
 * For now we use a bounding-box crop + scale (no projective transform).
 * A full homography warp would improve accuracy at oblique angles.
 */

export function warpToSquare(ctx, finders, size = 240) {
  const out = document.createElement('canvas').getContext('2d');
  out.canvas.width  = size;
  out.canvas.height = size;

  if (finders.length < 3) {
    // Fallback: use full frame
    out.drawImage(ctx.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height, 0, 0, size, size);
    return out;
  }

  // Find bounding box of the 3 finder centroids
  const xs = finders.map(f => f.x);
  const ys = finders.map(f => f.y);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const x1 = Math.max(...xs);
  const y1 = Math.max(...ys);

  // Add a small margin (10%) around the detected region
  const pw = x1 - x0;
  const ph = y1 - y0;
  const margin = Math.max(pw, ph) * 0.1;

  const sx = Math.max(0, x0 - margin);
  const sy = Math.max(0, y0 - margin);
  const sw = Math.min(ctx.canvas.width  - sx, pw + margin * 2);
  const sh = Math.min(ctx.canvas.height - sy, ph + margin * 2);

  out.drawImage(ctx.canvas, sx, sy, sw, sh, 0, 0, size, size);
  return out;
}

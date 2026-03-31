/**
 * CLASSIFY — Read one grid cell from a warped canvas and return its 6-bit value.
 *
 * Instead of simple density thresholds (which can only return 2 bits),
 * we now classify both:
 *   - Shape (2 bits): detected from the spatial distribution of dark pixels
 *   - Rotation (2 bits): detected from centroid offset within the cell
 *   - Fill (2 bits): detected from overall pixel density
 *
 * This matches the 6-bit glyph encoding in render/glyph.js exactly.
 *
 * NOTE: Shape/rotation classification from a low-res camera scan is hard.
 * The current implementation uses a simplified heuristic that works well
 * for screen-to-camera scenarios where the code is well-lit and mostly flat.
 * For production use, replace with a proper template matcher or CNN.
 */

/**
 * Classify a single cell.
 * @param {CanvasRenderingContext2D} ctx - warped image context
 * @param {number} x - cell left
 * @param {number} y - cell top
 * @param {number} s - cell size (square)
 * @returns {string} 6-bit string matching encoder output
 */
export function classifyCell(ctx, x, y, s) {
  const data = ctx.getImageData(Math.round(x), Math.round(y), Math.round(s), Math.round(s)).data;
  const pixels = s * s;

  // Build grayscale grid for spatial analysis
  const gray = new Float32Array(pixels);
  let totalDark = 0;
  for (let i = 0; i < pixels; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i] = lum;
    if (lum < 128) totalDark++;
  }

  const density = totalDark / pixels;

  // ── Fill (2 bits) from pixel density ──────────────────────────────────────
  // Must match glyph.js fill thresholds:
  //   solid   >60%  → '00'
  //   heavy   >40%  → '01'
  //   medium  >20%  → '10'
  //   outline <20%  → '11'
  let fill;
  if      (density > 0.6) fill = '00';
  else if (density > 0.4) fill = '01';
  else if (density > 0.2) fill = '10';
  else                    fill = '11';

  // ── Shape (2 bits) from dark pixel distribution ────────────────────────────
  // Divide cell into quadrants, compute dark pixel mass in each.
  const h = Math.round(s / 2);
  let tl = 0, tr = 0, bl = 0, br = 0;
  for (let row = 0; row < s; row++) {
    for (let col = 0; col < s; col++) {
      const dark = gray[row * Math.round(s) + col] < 128 ? 1 : 0;
      if (row < h && col < h) tl += dark;
      else if (row < h)       tr += dark;
      else if (col < h)       bl += dark;
      else                    br += dark;
    }
  }
  const quadMax = Math.max(tl, tr, bl, br) || 1;
  // Normalise
  const [ntl, ntr, nbl, nbr] = [tl, tr, bl, br].map(v => v / quadMax);
  // Circle: balanced across all quadrants
  // Square: high in all quadrants
  // Triangle: heavy on one side
  // Diamond: heavy at edges, light at corners
  const spread = Math.min(ntl, ntr, nbl, nbr); // how uniform?
  let shape;
  if      (spread > 0.7)              shape = '01'; // square — uniform mass
  else if (density > 0.35 && spread > 0.4) shape = '00'; // circle — moderate uniform
  else if (Math.abs(ntl + nbr - ntr - nbl) > 0.6) shape = '11'; // diamond — diagonal
  else                                shape = '10'; // triangle — lopsided

  // ── Rotation (2 bits) from centroid offset ────────────────────────────────
  // Centroid of dark pixels relative to cell center
  let cx = 0, cy = 0, darkCount = 0;
  for (let row = 0; row < Math.round(s); row++) {
    for (let col = 0; col < Math.round(s); col++) {
      if (gray[row * Math.round(s) + col] < 128) {
        cx += col; cy += row; darkCount++;
      }
    }
  }
  let rot = '00';
  if (darkCount > 0) {
    cx = cx / darkCount - s / 2;
    cy = cy / darkCount - s / 2;
    // Map centroid offset to rotation quadrant
    if      (cx < -s * 0.1 && cy < -s * 0.1) rot = '00';
    else if (cx >  s * 0.1 && cy < -s * 0.1) rot = '01';
    else if (cx >  s * 0.1 && cy >  s * 0.1) rot = '10';
    else if (cx < -s * 0.1 && cy >  s * 0.1) rot = '11';
    else                                       rot = '00'; // centred
  }

  return shape + rot + fill;
}

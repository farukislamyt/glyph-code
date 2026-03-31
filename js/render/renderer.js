/**
 * RENDERER — Render a bit-string frame onto a <canvas> element.
 *
 * Layout:
 *   - 3 finder patterns (top-left, top-right, bottom-left) for scanner orientation
 *   - Remaining cells filled with 6-bit glyphs from the frame bit-string
 *
 * Grid size is computed to fit all data glyphs in the remaining space.
 * Finder patterns occupy 3×3 glyph cells each.
 *
 * Canvas is always square (width × width).
 */

import { drawGlyph, drawFinder } from './glyph.js';

const FINDER_CELLS = 3;   // finder pattern is 3×3 cells
const BITS_PER_GLYPH = 6;

/**
 * Compute grid dimensions for a given number of data bits.
 * Returns { cols, rows, cellSize }.
 */
export function computeGrid(totalBits, canvasSize) {
  const totalGlyphs = Math.ceil(totalBits / BITS_PER_GLYPH);
  // Reserve 3 corners for finder patterns (each 3×3 = 9 cells, ×3 = 27)
  const finderCells = 3 * FINDER_CELLS * FINDER_CELLS;
  const dataGlyphs  = totalGlyphs + finderCells;
  const cols = Math.ceil(Math.sqrt(dataGlyphs));
  const rows = Math.ceil(dataGlyphs / cols);
  const cellSize = Math.floor(canvasSize / Math.max(cols, rows));
  return { cols, rows, cellSize };
}

/**
 * Returns true if position (col, row) is occupied by a finder pattern.
 * Finders are at top-left, top-right, bottom-left corners.
 */
function isFinder(col, row, cols, rows) {
  const f = FINDER_CELLS;
  return (
    (col < f && row < f) ||                          // top-left
    (col >= cols - f && row < f) ||                  // top-right
    (col < f && row >= rows - f)                     // bottom-left
  );
}

/** Render one frame of GlyphCode onto canvas. */
export function renderFrame(bits, canvas) {
  const ctx  = canvas.getContext('2d');
  const size = canvas.width; // assume square

  // Clear to white
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, size, size);

  const { cols, rows, cellSize } = computeGrid(bits.length, size);
  const finderSize = cellSize * FINDER_CELLS;

  // Draw finder patterns
  drawFinder(ctx, 0,                         0,                         finderSize);
  drawFinder(ctx, (cols - FINDER_CELLS) * cellSize, 0,                  finderSize);
  drawFinder(ctx, 0,                         (rows - FINDER_CELLS) * cellSize, finderSize);

  // Draw data glyphs in all non-finder cells
  const padded = bits.padEnd(cols * rows * BITS_PER_GLYPH, '0');
  let bitIdx = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isFinder(c, r, cols, rows)) continue;
      const glyph6 = padded.substr(bitIdx * BITS_PER_GLYPH, BITS_PER_GLYPH);
      drawGlyph(ctx, glyph6, c * cellSize, r * cellSize, cellSize);
      bitIdx++;
    }
  }

  // Quiet zone border
  ctx.strokeStyle = '#eee';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, size, size);
}

export { BITS_PER_GLYPH, FINDER_CELLS };

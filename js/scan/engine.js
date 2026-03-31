/**
 * ENGINE — Full scan pipeline: image → bit-string
 *
 * Pipeline:
 *   1. preprocess  — grayscale + adaptive threshold → binary image
 *   2. findBlobs   — connected component labelling
 *   3. detectFinders — pick 3 finder-pattern blobs
 *   4. warpToSquare  — perspective-correct crop
 *   5. classifyCell  — read each grid cell → 6 bits
 *
 * Returns a raw bit-string ready for stabilize() → decodeFrame().
 * Returns '' if fewer than 3 finder patterns are detected.
 */

import { preprocess }    from './preprocess.js';
import { findBlobs }     from './blob.js';
import { detectFinders } from './finder.js';
import { warpToSquare }  from './warp.js';
import { classifyCell }  from './classify.js';
import { FINDER_CELLS }  from '../render/renderer.js';
import { CHUNK_SIZE }    from '../core/encoder.js';

// Grid dimensions must match renderer.js computeGrid()
// For CHUNK_SIZE=480 bits, after ECC×3=1440, at 6 bits/glyph = 240 glyphs
// Plus 3 finder patterns at 3×3=27 cells = 267 total → 17 cols × 16 rows
const GRID_COLS = 17;
const GRID_ROWS = 16;

export function runEngine(ctx, w, h) {
  const bin     = preprocess(ctx, w, h);
  const blobs   = findBlobs(bin, w, h);
  const finders = detectFinders(blobs);

  if (finders.length < 3) return '';

  const wctx  = warpToSquare(ctx, finders);
  const wSize = wctx.canvas.width;
  const cellW = wSize / GRID_COLS;
  const cellH = wSize / GRID_ROWS;

  // Identify finder cell positions (same logic as renderer.js isFinder)
  function isFinder(c, r) {
    const f = FINDER_CELLS;
    return (
      (c < f && r < f) ||
      (c >= GRID_COLS - f && r < f) ||
      (c < f && r >= GRID_ROWS - f)
    );
  }

  let bits = '';
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (isFinder(c, r)) continue;
      bits += classifyCell(wctx, c * cellW, r * cellH, Math.min(cellW, cellH));
    }
  }

  return bits;
}

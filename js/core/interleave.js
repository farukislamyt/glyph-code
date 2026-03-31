/**
 * INTERLEAVE — Burst error protection
 *
 * Writes bits column-major into a w-wide matrix, then reads row-major.
 * This spreads consecutive bits apart in the output stream, so a
 * localised scan error (e.g. a smudge over a few glyphs) corrupts
 * spread-out bits rather than one contiguous block — making ECC far
 * more effective.
 *
 * De-interleave is the inverse: write row-major, read column-major.
 */

export function interleave(bits, w = 8) {
  const rows = [];
  for (let i = 0; i < bits.length; i += w)
    rows.push(bits.substr(i, w).padEnd(w, '0'));
  let out = '';
  for (let c = 0; c < w; c++)
    for (let r = 0; r < rows.length; r++)
      out += rows[r][c] || '0';
  return out;
}

export function deinterleave(bits, w = 8) {
  const len = bits.length;
  const numRows = Math.ceil(len / w);
  // Build column-major matrix then read row-major
  const matrix = Array.from({ length: numRows }, () => Array(w).fill('0'));
  let idx = 0;
  for (let c = 0; c < w; c++)
    for (let r = 0; r < numRows; r++)
      if (idx < len) matrix[r][c] = bits[idx++];
  return matrix.map(row => row.join('')).join('');
}

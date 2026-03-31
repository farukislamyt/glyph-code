/**
 * ENCODER — Text → GlyphCode frames
 *
 * Frame format (before ECC+interleave):
 *   [8 bits]  sync preamble  = 10101010
 *   [8 bits]  frame ID       (0-indexed, big-endian)
 *   [8 bits]  total frames   (big-endian)
 *   [8 bits]  checksum       of payload only
 *   [N bits]  payload chunk  (up to CHUNK_SIZE bits of raw data)
 *
 * After framing: encodeECC → interleave → array of bit strings.
 * Each bit string is handed to the renderer as one displayable frame.
 *
 * The renderer maps every 6 bits → 1 glyph:
 *   bits [0-1] → shape   (4 shapes)
 *   bits [2-3] → rotation (4 × 90°)
 *   bits [4-5] → fill    (4 density levels)
 * = 64 unique glyph states → 6 bits per cell.
 */

import { toBits }     from './bitstream.js';
import { encodeECC }  from './ecc.js';
import { interleave } from './interleave.js';
import { checksum }   from './checksum.js';

// Payload bits per frame (before ECC tripling).
// Keep this a multiple of 6 (bits-per-glyph) and 32 (ECC block size).
// 480 bits × 3 (ECC) = 1440 bits per frame → 240 glyphs → 16×15 grid (fits 320px canvas).
const CHUNK_SIZE = 480;

/** Encode text into one or more displayable bit-string frames. */
export function encodeDataMulti(text) {
  const rawBits = toBits(text);
  const frames  = [];

  const totalFrames = Math.ceil(rawBits.length / CHUNK_SIZE) || 1;

  for (let i = 0; i < totalFrames; i++) {
    const chunk   = rawBits.substr(i * CHUNK_SIZE, CHUNK_SIZE).padEnd(CHUNK_SIZE, '0');
    const id      = i.toString(2).padStart(8, '0');
    const total   = totalFrames.toString(2).padStart(8, '0');
    const cs      = checksum(chunk);

    // Assemble header + payload
    const frame = '10101010' + id + total + cs + chunk;

    // Apply ECC tripling then interleave
    frames.push(interleave(encodeECC(frame)));
  }

  return frames;
}

export { CHUNK_SIZE };

/**
 * DECODER — GlyphCode bits → Text
 *
 * Reverses the encoder pipeline:
 *   deinterleave → decodeECC → verify sync → extract payload
 *
 * decodeFrame() processes a single scanned bit-string and returns:
 *   { id, total, checksumOk, payload }
 *
 * assembleFrames() takes a complete map of { id → frame } and
 * reassembles the original text.
 */

import { fromBits }      from './bitstream.js';
import { decodeECC }     from './ecc.js';
import { deinterleave }  from './interleave.js';
import { verifyChecksum } from './checksum.js';

const SYNC = '10101010';

/** Decode a single raw bit-string from the scanner into a frame object.
 *  Returns null if the frame is corrupt or unrecognised. */
export function decodeFrame(bits) {
  // Reverse interleave then ECC
  const deint  = deinterleave(bits);
  const clean  = decodeECC(deint);

  // Verify sync preamble
  if (clean.substr(0, 8) !== SYNC) return null;

  const id       = parseInt(clean.substr(8,  8), 2);
  const total    = parseInt(clean.substr(16, 8), 2);
  const cs       = clean.substr(24, 8);
  const payload  = clean.substr(32);

  const checksumOk = verifyChecksum(payload, cs);

  return { id, total, checksumOk, payload };
}

/** Given a complete id→payload map, reassemble and decode the original text. */
export function assembleFrames(frameMap, total) {
  let allBits = '';
  for (let i = 0; i < total; i++) {
    allBits += frameMap[i] ?? '';
  }
  // Strip trailing padding zeros that were added during encoding
  // The original byte stream length is implicit in valid UTF-8 sequences;
  // TextDecoder handles malformed trailing bytes gracefully.
  return fromBits(allBits);
}

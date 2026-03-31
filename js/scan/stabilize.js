/**
 * STABILIZE — Require N identical consecutive reads before accepting
 *
 * Camera scans are noisy. We only trust a result when the scanner
 * produces the same bit-string REQUIRED_MATCHES times in a row.
 * This eliminates single-frame noise and partial reads.
 */

const REQUIRED_MATCHES = 2; // consecutive identical reads needed

let history = [];

export function stabilize(bits) {
  if (!bits || bits.length < 32) {
    history = [];
    return null;
  }

  history.push(bits);
  if (history.length > REQUIRED_MATCHES) history.shift();

  if (history.length === REQUIRED_MATCHES && history.every(b => b === bits)) {
    return bits;
  }
  return null;
}

/** Reset stabiliser state (call when starting a new scan session) */
export function resetStabilizer() {
  history = [];
}

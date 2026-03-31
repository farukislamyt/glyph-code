/**
 * BITSTREAM — Text ↔ Binary string conversion
 * Uses UTF-8 encoding so any unicode text is supported.
 */

/** Convert text to a binary string e.g. "A" → "01000001" */
export const toBits = text =>
  Array.from(new TextEncoder().encode(text))
    .map(b => b.toString(2).padStart(8, '0'))
    .join('');

/** Convert a binary string back to text */
export const fromBits = bits => {
  const bytes = (bits.match(/.{1,8}/g) || []).map(x => parseInt(x, 2));
  return new TextDecoder().decode(new Uint8Array(bytes));
};

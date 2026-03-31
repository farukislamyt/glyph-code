/**
 * ECC — Error Correction Code (Triple Redundancy)
 *
 * Strategy: repeat every 32-bit block 3× during encode.
 * On decode, use majority vote per bit position across the 3 copies.
 * This corrects up to 1 corrupted copy per block (33% error tolerance).
 *
 * Trade-off: 3× data expansion. A 2400-bit payload becomes 7200 bits.
 * The glyph renderer handles this transparently.
 */

/** Encode: triple every 32-bit block */
export function encodeECC(bits) {
  let out = '';
  for (let i = 0; i < bits.length; i += 32) {
    const block = bits.substr(i, 32).padEnd(32, '0');
    out += block + block + block; // 3× redundancy
  }
  return out;
}

/** Decode: majority vote across 3 copies of each 32-bit block */
export function decodeECC(bits) {
  let out = '';
  for (let i = 0; i < bits.length; i += 96) {
    const copies = [
      bits.substr(i,      32),
      bits.substr(i + 32, 32),
      bits.substr(i + 64, 32),
    ];
    // For each bit position, take the majority (2-of-3 vote)
    for (let b = 0; b < 32; b++) {
      const ones = copies.filter(c => c[b] === '1').length;
      out += ones >= 2 ? '1' : '0';
    }
  }
  return out;
}

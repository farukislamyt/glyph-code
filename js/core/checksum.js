/**
 * CHECKSUM — Simple 8-bit integrity check
 * Sums all bit values mod 256 and returns as 8-bit binary string.
 * Used to detect corrupted frames before ECC decode.
 */
export const checksum = bits =>
  (bits.split('').reduce((acc, x) => acc + +x, 0) % 256)
    .toString(2).padStart(8, '0');

/** Returns true if the checksum of `data` matches `expected` (both binary strings) */
export const verifyChecksum = (data, expected) => checksum(data) === expected;

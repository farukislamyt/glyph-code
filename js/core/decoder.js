import { fromBits } from "./bitstream.js";
import { decodeECC } from "./ecc.js";

export function decode(bits){
 const clean=decodeECC(bits);
 return fromBits(clean.substr(8));
}
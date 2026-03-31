import { toBits } from "./bitstream.js";
import { encodeECC } from "./ecc.js";

const MAX_GRID=28;
const BITS_PER_GLYPH=6;
const MAX_BITS=MAX_GRID*MAX_GRID*BITS_PER_GLYPH;

export function encodeDataHybrid(text){
 const raw=toBits(text);

 if(raw.length<=MAX_BITS){
  return {mode:"single",frames:[encodeECC("11111111"+raw)]};
 }

 const size=MAX_BITS;
 let frames=[];
 for(let i=0;i<raw.length;i+=size){
  let chunk=raw.substr(i,size);
  frames.push(encodeECC("10101010"+chunk));
 }
 return {mode:"multi",frames};
}
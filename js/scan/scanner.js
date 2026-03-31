import { decode } from "../core/decoder.js";

export function startScanner(video){
 const c=document.createElement("canvas");
 const ctx=c.getContext("2d");
 c.width=240;c.height=240;

 function loop(){
  ctx.drawImage(video,0,0,240,240);
  // simplified demo decode
  requestAnimationFrame(loop);
 }
 loop();
}
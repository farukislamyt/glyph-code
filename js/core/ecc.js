export function encodeECC(bits){
 const BLOCK=32;
 let blocks=[];
 for(let i=0;i<bits.length;i+=BLOCK){
  let b=bits.substr(i,BLOCK).padEnd(BLOCK,"0");
  const parity=b.split("").reduce((a,x)=>a^+x,0);
  const full=b+parity;
  blocks.push(full,full,full);
 }
 return interleave(blocks);
}

export function decodeECC(bits){
 const BLOCK=33;
 let out="";
 for(let i=0;i<bits.length;i+=BLOCK*3){
  let b1=bits.substr(i,BLOCK);
  let b2=bits.substr(i+BLOCK,BLOCK);
  let b3=bits.substr(i+BLOCK*2,BLOCK);

  let clean="";
  for(let j=0;j<BLOCK;j++){
   let ones=(b1[j]=="1")+(b2[j]=="1")+(b3[j]=="1");
   clean+=ones>=2?"1":"0";
  }
  out+=clean.substr(0,32);
 }
 return out;
}

function interleave(blocks){
 let w=blocks[0].length;
 let out="";
 for(let i=0;i<w;i++){
  for(let b of blocks) out+=b[i];
 }
 return out;
}
export function drawGlyph(ctx,b,x,y,s){
 const sh=b.substr(0,2),r=parseInt(b.substr(2,2),2),ph=b.substr(4,2);
 let dx=0,dy=0;
 if(ph==="01"){dx=-s*.25;dy=-s*.25;}
 if(ph==="10"){dx=s*.25;dy=-s*.25;}
 if(ph==="11"){dy=s*.25;}
 ctx.save();
 ctx.translate(x+s/2+dx,y+s/2+dy);
 ctx.rotate(r*Math.PI/2);
 ctx.beginPath();
 if(sh==="00")ctx.arc(0,0,s*.3,0,Math.PI*2);
 if(sh==="01")ctx.rect(-s*.3,-s*.3,s*.6,s*.6);
 if(sh==="10"){ctx.moveTo(0,-s*.3);ctx.lineTo(s*.3,s*.3);ctx.lineTo(-s*.3,s*.3);}
 if(sh==="11"){ctx.moveTo(0,-s*.3);ctx.lineTo(s*.3,0);ctx.lineTo(0,s*.3);ctx.lineTo(-s*.3,0);}
 ctx.fill();
 ctx.restore();
}
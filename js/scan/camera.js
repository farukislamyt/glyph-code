export async function startCamera(v){
 const s=await navigator.mediaDevices.getUserMedia({video:true});
 v.srcObject=s;
}
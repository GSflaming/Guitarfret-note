export const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export const PERSPECTIVE=1200;
export function projectPoint(x,y,rx,ry,perspective=PERSPECTIVE){
  const sx=Math.sin(rx),cx=Math.cos(rx),sy=Math.sin(ry),cy=Math.cos(ry);
  const denominator=1-(sx*y-cx*sy*x)/perspective;
  return {x:cy*x/denominator,y:(sx*sy*x+cx*y)/denominator};
}
export function unprojectPoint(u,v,rx,ry,perspective=PERSPECTIVE){
  const sx=Math.sin(rx),cx=Math.cos(rx),sy=Math.sin(ry),cy=Math.cos(ry);
  const a=cy-u*cx*sy/perspective,b=u*sx/perspective,c=sx*sy-v*cx*sy/perspective,d=cx+v*sx/perspective;
  const determinant=a*d-b*c;
  return {x:(u*d-b*v)/determinant,y:(a*v-u*c)/determinant};
}
export function wheelIntent(event){
  const factor=event.deltaMode===1?16:event.deltaMode===2?500:1;
  if(event.ctrlKey||event.metaKey||event.altKey)return {type:'zoom',factor:Math.exp(-clamp(event.deltaY*factor,-150,150)*.008)};
  return {type:'pan',x:-event.deltaX*factor,y:-event.deltaY*factor};
}
export function anchoredZoom(view,nextScale,anchor,center){
  const scale=clamp(nextScale,.55,2.2),ratio=scale/view.scale;
  return {scale,x:anchor.x-center.x-(anchor.x-center.x-view.x)*ratio,y:anchor.y-center.y-(anchor.y-center.y-view.y)*ratio};
}

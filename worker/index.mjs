// Preserve the existing namespace so this rollback does not erase saved data.
// The inert class never reads jobs or invokes AI. An old alarm clears itself.
export class RecognitionGate {
 constructor(ctx){this.storage=ctx.storage;}
 async alarm(){await this.storage.deleteAlarm();}
 async fetch(){await this.storage.deleteAlarm();return retiredResponse();}
}
export const isRetiredRoute=path=>['/api/','/score/','/samples/','/vendor/pdfjs/','/local-demo/'].some(prefix=>path.startsWith(prefix));
export const retiredResponse=()=>Response.json({error:{code:'FEATURE_PAUSED',message:'乐谱识别已暂停，当前为纯指板版本。请刷新页面。'}},{status:410,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
export async function handleRequest(request,env){
 const url=new URL(request.url);
 if(isRetiredRoute(url.pathname))return retiredResponse();
 return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404});
}
export default {fetch:handleRequest};

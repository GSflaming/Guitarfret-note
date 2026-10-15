import {spawnSync} from 'node:child_process';
// Static fretboard only: no AI binding, model call, or paid resource provisioning.
for(const [cmd,args] of [['npm',['test']],['npm',['run','build']],[process.execPath,['scripts/wrangler.mjs']]]){
 const result=spawnSync(cmd,args,{stdio:'inherit',shell:process.platform==='win32'&&cmd!==process.execPath});if(result.status!==0)process.exit(result.status??1);
}

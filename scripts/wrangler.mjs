import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
// The maintainer's ignored override retains the existing deployment and data.
// Fresh clones deploy an assets-only site with no AI or storage resources.
const config=existsSync('wrangler.local.jsonc')?'wrangler.local.jsonc':'wrangler.jsonc';
const args=['wrangler','deploy','--config',config,'--env','production'];
if(process.argv.includes('--dry-run'))args.push('--dry-run','--outdir','.wrangler/worker-build');
console.log('Cloudflare configuration: '+config);
const result=spawnSync('npx',args,{stdio:'inherit',shell:process.platform==='win32'});
process.exit(result.status??1);

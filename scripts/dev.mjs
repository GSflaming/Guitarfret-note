import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import {isRetiredRoute,retiredResponse} from '../worker/index.mjs';
const built=spawnSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit'});if(built.status)process.exit(built.status);
const root=resolve('dist');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json'};
const server=createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const url=new URL(req.url,'http://127.0.0.1');
 if(isRetiredRoute(url.pathname)){
  const response=retiredResponse();res.writeHead(response.status,Object.fromEntries(response.headers));res.end(req.method==='HEAD'?undefined:await response.text());return;
 }
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end('Method not allowed');return;}
 if(url.pathname==='/'&&url.searchParams.has('demo')){res.writeHead(302,{Location:'/'});res.end();return;}
 try{
  const file=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+sep)){res.writeHead(404);res.end('Not found');return;}
  const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream'});res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>console.log(`Fret / Note: http://localhost:${server.address().port} (pure fretboard)`));

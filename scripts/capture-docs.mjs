import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,mkdtemp,rm,access} from 'node:fs/promises';
import {resolve,extname,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';

// Calls the actual app functions over a loopback-only DevTools connection.
// The bridge exists in this capture server's response only, never in dist/.
const wait=ms=>new Promise(done=>setTimeout(done,ms));
const candidates=[process.env.CHROME_BIN,...(process.platform==='darwin'?['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']:process.platform==='win32'?[join(process.env.PROGRAMFILES||'C:\\Program Files','Google/Chrome/Application/chrome.exe'),join(process.env['PROGRAMFILES(X86)']||'C:\\Program Files (x86)','Google/Chrome/Application/chrome.exe')]:['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'])].filter(Boolean);
let chrome;for(const candidate of candidates){try{await access(candidate);chrome=candidate;break;}catch{}}
if(!chrome)throw new Error('Install Chrome, or set CHROME_BIN to its executable path.');
const root=resolve('dist'),output=resolve('docs/images'),frames=resolve('tmp/docs-frames');await mkdir(output,{recursive:true});await mkdir(frames,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript'};
const bridge=`\nwindow.__docsApi={
 language:language=>i18n.setLanguage(language),open:()=>tools.open(),panel:name=>tools.select(name),close:()=>tools.close(),
 select:position=>selectPosition(position),clear:()=>clearSelection(),theme:name=>applyTheme(name),tuning:name=>changeTuning(PRESETS[name].notes,name),
 setNotes:positions=>{state.selected=positions;updateSelection();persist();requestDraw();},play:mode=>replay(state.selected,mode),stop:()=>stopPlayback(),
 recording:active=>togglePresentation(active),custom:()=>openTuning(),dismissCustom:()=>$('tuning-dialog').close(),
 platform:value=>{$('shortcut-platform').value=value;$('shortcut-platform').dispatchEvent(new Event('change'));},scroll:value=>{$('controls').scrollTop=value;},
 input:value=>{$('note-input').value=value;$('note-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));},
 snapshot:()=>({language:i18n.language,notes:state.selected,tuning:state.tuning,chord:$('chord-symbol').textContent,description:$('chord-description').textContent,input:$('note-input').value,inputError:$('input-error').textContent,sceneNames:state.scenes.map(s=>s.name)}),
 audit:()=>{const errors=[];function visit(node){if(node.nodeType===1&&node.matches('script,style,[data-native-language]'))return;if(node.nodeType===3&&/\\p{Script=Han}/u.test(node.nodeValue))errors.push(node.nodeValue.trim());if(node.nodeType===1)for(const a of ['title','aria-label','placeholder','content'])if(/\\p{Script=Han}/u.test(node.getAttribute(a)||''))errors.push(node.getAttribute(a));for(const c of node.childNodes||[])visit(c);}visit(document.documentElement);return errors;},
 layout:()=>[...document.querySelectorAll('#controls:not([hidden]),#tool-dock:not([hidden]),#language-select')].filter(n=>n.getClientRects().length).map(n=>({id:n.id,overflow:n.scrollWidth>n.clientWidth+1,left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right,width:innerWidth}))
};\n`;
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1'),file=resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(!file.startsWith(root+sep)){res.writeHead(404).end();return;}
  let data=await readFile(file);
  if(file.endsWith('index.html')){
   const language=url.searchParams.get('lang')==='en'?'en':'zh';
   const state={tuning:[40,45,50,55,59,64],preset:'standard',selected:[],range:[0,12],uiVersion:2,labels:true,chordNames:true,multi:true,sound:true,tilt:false,theme:'light',view:{x:0,y:0,scale:1},tempo:110,direction:'up',scenes:[]};
   const seed=`<script>localStorage.setItem('fret-note-studio-v1',${JSON.stringify(JSON.stringify(state))});localStorage.setItem('fret-note-language',${JSON.stringify(language)});localStorage.setItem('fret-note-shortcut-platform','auto');</script>`;
   data=Buffer.from(data.toString().replace('<script type="module"',seed+'<script type="module"'));
  }
  if(file.endsWith('app.js'))data=Buffer.from(data.toString()+bridge);
  res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'}).end(data);
 }catch{res.writeHead(404).end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const profile=await mkdtemp(join(tmpdir(),'guitarfret-docs-'));
const browserProcess=spawn(chrome,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--hide-scrollbars','--mute-audio','--autoplay-policy=no-user-gesture-required','--force-device-scale-factor=1','--window-size=1000,660','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
let socket;const report={checks:[],animations:[]};
try{
 let active;for(let i=0;i<100;i++){try{active=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).trim().split('\n');break;}catch{await wait(100);}}
 if(!active)throw new Error('Chrome did not start its local debug endpoint.');
 socket=new WebSocket('ws://127.0.0.1:'+active[0]+active[1]);await once(socket,'open');
 let sequence=0;const pending=new Map();
 socket.addEventListener('message',event=>{const response=JSON.parse(event.data);if(!response.id)return;const task=pending.get(response.id);if(!task)return;pending.delete(response.id);clearTimeout(task.timer);response.error?task.reject(Error(JSON.stringify(response.error))):task.resolve(response.result);});
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(Error('DevTools timeout: '+method));},15000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
 const {targetId}=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
 const call=(method,params={})=>send(method,params,sessionId);
 const evaluate=async expression=>{const response=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(response.exceptionDetails)throw Error(response.exceptionDetails.exception?.description||response.exceptionDetails.text);return response.result.value;};
 await call('Page.enable');await call('Runtime.enable');
 async function navigate(language){await call('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/?lang=${language}`});for(let i=0;i<100;i++){try{if(await evaluate('!!window.__docsApi'))return;}catch{}await wait(50);}throw Error('Application capture bridge not ready.');}
 const api=expression=>evaluate('window.__docsApi.'+expression);
 const c=[{string:5,fret:3},{string:4,fret:2},{string:3,fret:0},{string:2,fret:1},{string:1,fret:0}],d=[{string:6,fret:0},{string:5,fret:0},{string:4,fret:0}];
 async function validate(){
  await navigate('en');await api('setNotes('+JSON.stringify(c)+')');const before=await api('snapshot()');
  await api('language("zh")');await api('language("en")');const after=await api('snapshot()');if(JSON.stringify(before.notes)!==JSON.stringify(after.notes)||before.chord!==after.chord)throw Error('Language switch changed music state.');
  await api('input("6:99")');if(!/Frets must/.test((await api('snapshot()')).inputError))throw Error('English validation failed');await api('language("zh")');await api('language("en")');if(!/Frets must/.test((await api('snapshot()')).inputError))throw Error('Language switch lost validation text');
  for(const width of [1000,390]){
   await call('Emulation.setDeviceMetricsOverride',{width,height:760,deviceScaleFactor:1,mobile:false});
   for(const panel of ['selection','playback','appearance','view','frets','tuning','notes','scenes','shortcuts']){await api('panel('+JSON.stringify(panel)+')');const leftovers=await api('audit()');if(leftovers.length)throw Error('English copy missing: '+JSON.stringify(leftovers));const layout=await api('layout()');if(layout.some(n=>n.overflow||n.left<0||n.right>n.width+1))throw Error('Layout overflow: '+JSON.stringify(layout));}
  }
  await api('custom()');if((await api('audit()')).length)throw Error('Custom tuning not translated');
  const missingPitch=await evaluate(`(()=>{const input=document.querySelector('#custom-tuning-fields input');input.value='';input.dispatchEvent(new Event('invalid'));return input.validationMessage;})()`);if(!/Enter a note/.test(missingPitch))throw Error('Native pitch validation not translated');
  await evaluate(`document.querySelector('#custom-tuning-fields input').value='F2'`);await api('language("zh")');await api('language("en")');if(await evaluate(`document.querySelector('#custom-tuning-fields input').value`)!=='F2')throw Error('Language switch lost custom tuning edit');await api('dismissCustom()');
  const missingScene=await evaluate(`(()=>{const input=document.getElementById('scene-name');input.value='';input.dispatchEvent(new Event('invalid'));return input.validationMessage;})()`);if(missingScene!=='Enter a scene name.')throw Error('Native scene validation not translated');
  await evaluate(`document.getElementById('save-scene').click();document.getElementById('scene-name').value='Review scene';document.getElementById('scene-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));`);await api('language("zh")');await api('language("en")');if(!(await api('snapshot()')).sceneNames.includes('Review scene'))throw Error('Language switch changed saved scenes');
  await api('play("chord")');await wait(90);await api('language("zh")');await api('language("en")');if(!/Playing together/.test(await evaluate(`document.getElementById('playback-status').textContent`)))throw Error('Active playback label not translated');await api('stop()');
  if((await api('audit()')).length)throw Error('Untranslated dynamic UI after switching');
  if(!await evaluate(`new URL(location.href).searchParams.get('lang')==='en'`))throw Error('Language query did not follow manual choice');
  await call('Emulation.setDeviceMetricsOverride',{width:1000,height:660,deviceScaleFactor:1,mobile:false});report.checks.push('English panels, accessible labels, validation, dialogs, state preservation and 390/1000px layout passed');console.log(report.checks.at(-1));
 }
 await validate();
 const scenes=process.env.DOCS_VALIDATE_ONLY?[]:process.env.DOCS_SCENE?[process.env.DOCS_SCENE]:['overview','selection','playback','tuning','shortcuts'];
 const languages=process.env.DOCS_LANGUAGE?[process.env.DOCS_LANGUAGE]:['zh','en'];
 for(const language of languages)for(const scene of scenes){
  await navigate(language);const name=scene+(language==='en'?'.en':''),folder=join(frames,name);await mkdir(folder,{recursive:true});const durations=[];
  async function frame(duration=400){await wait(50);const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(folder,String(durations.length).padStart(3,'0')+'.png'),Buffer.from(data,'base64'));durations.push(duration);await wait(duration);}
  if(scene==='overview'){
   await api('setNotes('+JSON.stringify(c)+')');await frame(600);await api('open()');await frame(1000);await api('panel("appearance")');await frame(900);await api('theme("dark")');await frame(900);await api('recording(true)');await frame(1100);await api('recording(false)');await api('theme("light")');await api('open()');await frame(800);
  }else if(scene==='selection'){
   await api('panel("selection")');await frame(550);for(const note of c){await api('select('+JSON.stringify(note)+')');await frame(320);await frame(160);}await frame(1100);await api('select('+JSON.stringify(c.at(-1))+')');await frame(650);await api('select('+JSON.stringify(c.at(-1))+')');await frame(850);
  }else if(scene==='playback'){
   await api('setNotes('+JSON.stringify(c)+')');await api('panel("playback")');await frame(650);await api('play("arpeggio")');for(let i=0;i<12;i++)await frame(140);await api('stop()');await frame(550);await api('play("chord")');for(let i=0;i<6;i++)await frame(140);await api('stop()');await frame(750);
  }else if(scene==='tuning'){
   await api('panel("tuning")');await frame(850);await api('tuning("dropd")');await api('setNotes('+JSON.stringify(d)+')');await frame(1100);await api('theme("dark")');await frame(1100);await api('custom()');await frame(1000);await api('dismissCustom()');await api('theme("light")');await frame(850);
  }else{
   await api('open()');await frame(800);await api('panel("shortcuts")');await frame(1000);await api('platform("windows")');await frame(1000);await api('scroll(2000)');await frame(1200);await api('platform("mac")');await frame(1000);await api('scroll(0)');await frame(800);
  }
  if(language==='en'){const leftovers=await api('audit()');if(leftovers.length)throw Error('English demo includes untranslated UI: '+JSON.stringify(leftovers));}
  await writeFile(join(folder,'durations.json'),JSON.stringify(durations));
  const python=process.env.DOCS_PYTHON||'python3',encoded=spawnSync(python,['scripts/encode-gif.py',folder,join(output,name+'.gif')],{encoding:'utf8'});if(encoded.status!==0)throw Error('GIF encoder failed. Install Pillow for '+python+'\n'+encoded.stderr);
  report.animations.push({name,frames:durations.length,duration:durations.reduce((a,b)=>a+b,0),language});console.log('Recorded '+name+'.gif · '+durations.length+' frames');
 }
 await send('Browser.close').catch(()=>{});
 await writeFile(resolve('tmp/docs-capture-verification.json'),JSON.stringify(report,null,2)+'\n');
}finally{
 socket?.close();browserProcess.kill();await new Promise(done=>server.close(done));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}

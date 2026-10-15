import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,mkdtemp,rm,access} from 'node:fs/promises';
import {resolve,extname,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {shortcutRows} from '../dist/shortcuts.mjs';

// Render the actual app in an isolated headless Chrome profile. No personal
// browser profile, live UI automation, AI service or screenshot editing is used.
const candidates=[process.env.CHROME_BIN,...(process.platform==='darwin'?['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']:process.platform==='win32'?[join(process.env.PROGRAMFILES||'C:\\Program Files','Google/Chrome/Application/chrome.exe'),join(process.env['PROGRAMFILES(X86)']||'C:\\Program Files (x86)','Google/Chrome/Application/chrome.exe')]:['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'])].filter(Boolean);
let chrome;for(const candidate of candidates){try{await access(candidate);chrome=candidate;break;}catch{}}
if(!chrome)throw new Error('Install Chrome, or set CHROME_BIN to its executable path.');
const root=resolve('dist'),output=resolve('docs/images');await mkdir(output,{recursive:true});
const scenes=['overview','selection','playback','tuning'];
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript'};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    const file=resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
    if(!file.startsWith(root+sep)){res.writeHead(404).end();return;}
    let data=await readFile(file);
    if(file.endsWith('index.html')){
      const scene=scenes.includes(url.searchParams.get('scene'))?url.searchParams.get('scene'):'overview';
      const state={tuning:scene==='tuning'?[38,45,50,55,59,64]:[40,45,50,55,59,64],preset:scene==='tuning'?'dropd':'standard',selected:scene==='tuning'?[{string:6,fret:0},{string:5,fret:0},{string:4,fret:0}]:[{string:5,fret:3},{string:4,fret:2},{string:3,fret:0},{string:2,fret:1},{string:1,fret:0}],range:[0,12],uiVersion:2,labels:true,chordNames:true,multi:true,sound:true,tilt:false,theme:scene==='tuning'?'dark':'light',view:{x:0,y:0,scale:1},tempo:110,direction:'up',scenes:[]};
      // Capture-only seed; production files are never modified.
      const seed=`<script>window.__docsScene=${JSON.stringify(scene)};localStorage.setItem('fret-note-studio-v1',${JSON.stringify(JSON.stringify(state))});localStorage.setItem('fret-note-shortcut-platform','mac');</script>`;
      data=Buffer.from(data.toString().replace('<script type="module"',seed+'<script type="module"'));
    }
    if(file.endsWith('app.js'))data=Buffer.from(data.toString()+`\nif(window.__docsScene==='overview')tools.open();else tools.select(window.__docsScene);\n`);
    res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'}).end(data);
  }catch{res.writeHead(404).end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const profile=await mkdtemp(join(tmpdir(),'guitarfret-docs-'));
try{
  for(const scene of scenes){
    const args=['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--hide-scrollbars','--force-device-scale-factor=1','--force-prefers-reduced-motion','--window-size=1100,660','--virtual-time-budget=1800','--user-data-dir='+profile,'--screenshot='+join(output,scene+'.png'),`http://127.0.0.1:${server.address().port}/?scene=${scene}`];
    const child=spawn(chrome,args,{stdio:['ignore','ignore','pipe'],timeout:30000});let errors='';child.stderr.on('data',data=>errors+=data);
    const [code]=await once(child,'exit');if(code!==0)throw new Error('Chrome capture failed: '+errors.slice(-2000));
    console.log('Captured '+scene+'.png');
  }
}finally{await new Promise(done=>server.close(done));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});}

// A code-native diagram derives its key labels from the shipped shortcut model.
const escape=text=>text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const windows=shortcutRows('windows'),mac=shortcutRows('mac');
const englishActions=['Expand / collapse tools','Play selected notes together','Play arpeggio','Enter / leave recording mode','Reset position and size','Open shortcut guide','Close / stop / leave / clear','Move string / fret (board focused)','Select / deselect (board focused)','Move between controls','First / last circular tool','Zoom with the mouse'];
for(const language of ['zh','en']){
  const english=language==='en';
  const labels=english?{title:'Shortcuts for your system',subtitle:'Tools → Shortcuts · Detected automatically; manual override available',action:'Action',note:'Press letter keys directly. Shortcuts pause while typing; Esc follows the current context.',desc:'A shortcut reference generated from the application. Windows uses Ctrl plus scroll wheel; macOS uses Command plus scroll wheel.'}:{title:'快捷键随系统显示',subtitle:'工具 → 快捷键 · 自动识别，也可手动切换',action:'功能',note:'字母键直接按；输入文字时不触发。Esc 根据当前状态处理。',desc:'由应用当前快捷键配置生成的功能说明图。Windows 使用 Ctrl 加滚轮，macOS 使用 Command 加滚轮；字母快捷键直接按。'};
  const localize=keys=>english?keys.replace('Space 空格','Space').replace('滚轮','scroll wheel'):keys;
  const rows=windows.map(([action,keys],i)=>{const y=146+i*39;return `<path d="M32 ${y+17}H868" stroke="#e8e8e8"/><text x="40" y="${y}">${escape(english?englishActions[i]:action)}</text><text x="500" y="${y}" class="key">${escape(localize(keys))}</text><text x="700" y="${y}" class="key">${escape(localize(mac[i][1]))}</text>`;}).join('');
  const filename=english?'shortcuts.en.svg':'shortcuts.svg';
  await writeFile(join(output,filename),`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="668" viewBox="0 0 900 668" role="img" aria-labelledby="title desc"><title id="title">${labels.title}</title><desc id="desc">${labels.desc}</desc><style>text{font:15px -apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;fill:#242424}.key{font:14px -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif}.muted{fill:#6f6f6f;font-size:13px}</style><rect width="900" height="668" rx="16" fill="#fafafa"/><text x="40" y="47" style="font-size:25px;font-weight:600">${labels.title}</text><text x="40" y="77" class="muted">${labels.subtitle}</text><text x="40" y="109" class="muted">${labels.action}</text><text x="500" y="109" style="font-weight:600">Windows</text><text x="700" y="109" style="font-weight:600">macOS</text>${rows}<text x="40" y="635" class="muted">${labels.note}</text></svg>\n`);
  console.log('Generated '+filename+' from dist/shortcuts.mjs');
}

import {PRESETS,parsePitch,noteName,octave,fullName,frequency,midiAt,fretX,noteX,rangeCamera,parsePositions,findNotes} from './music.mjs';

import {clamp,unprojectPoint,wheelIntent,anchoredZoom} from './view.mjs';
import {identifyChord} from './chords.mjs';
import {playbackPlan} from './playback.mjs';
import {mountTools} from './tools.mjs';
import {mountNotice} from './notice.mjs';
import {mountShortcuts,shortcutAction,canHandleShortcut} from './shortcuts.mjs';

const $=id=>document.getElementById(id);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const STORAGE='fret-note-studio-v1';
const state={tuning:[...PRESETS.standard.notes],preset:'standard',selected:[],range:[0,12],labels:true,chordNames:true,multi:true,sound:true,tilt:true,theme:'light',uiVersion:2,view:{x:0,y:0,scale:1},tempo:110,direction:'up',inputMode:'position',scenes:[]};
let storageAvailable=true;
try {
  const saved=JSON.parse(localStorage.getItem(STORAGE)||'null');
  if(saved && Array.isArray(saved.tuning) && saved.tuning.length===6 && saved.tuning.every(n=>Number.isInteger(n)&&n>=24&&n<=88)){
    state.tuning=saved.tuning;state.preset=PRESETS[saved.preset]&&PRESETS[saved.preset].notes.every((n,i)=>n===saved.tuning[i])?saved.preset:'custom';
    if(validRange(saved.range))state.range=saved.range;
    state.selected=validPositions(saved.selected);state.labels=saved.labels!==false;state.sound=saved.sound!==false;state.multi=saved.uiVersion===2?saved.multi!==false:true;
    state.theme=saved.theme==='dark'?'dark':'light';state.tilt=saved.tilt!==false;
    state.chordNames=saved.chordNames!==false;
    if(Number.isFinite(saved.tempo))state.tempo=clamp(saved.tempo,40,240);
    if(['up','down','selection'].includes(saved.direction))state.direction=saved.direction;
    if(validView(saved.view))state.view={...saved.view};
    state.scenes=Array.isArray(saved.scenes)?saved.scenes.filter(validScene).slice(0,50):[];
  }
}catch {storageAvailable=false;}
function validView(view){return view&&['x','y','scale'].every(k=>Number.isFinite(view[k]))&&view.scale>=.55&&view.scale<=2.2;}
function validRange(range){return Array.isArray(range)&&range.length===2&&range.every(Number.isInteger)&&range[0]>=0&&range[0]<range[1]&&range[1]<=24;}
function validPositions(items){return Array.isArray(items)?items.filter(p=>p&&Number.isInteger(p.string)&&p.string>=1&&p.string<=6&&Number.isInteger(p.fret)&&p.fret>=0&&p.fret<=24).slice(0,150):[];}
function validScene(scene){return scene&&typeof scene.name==='string'&&typeof scene.id==='string'&&validRange(scene.range)&&Array.isArray(scene.tuning)&&scene.tuning.length===6&&scene.tuning.every(n=>Number.isInteger(n)&&n>=24&&n<=88);}
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch{storageAvailable=false;toast('浏览器无法保存设置；当前演示仍可继续。');}}
const notice=mountNotice({document,onDismiss:()=>$('fretboard').focus({preventScroll:true})});
function toast(message){notice.show(message);}

document.documentElement.dataset.theme=state.theme;
const surface=$('surface'),anchor=$('board-anchor'),poseElement=$('board-pose'),tiltElement=$('board-tilt');
let pose={...state.view},poseAim={...state.view},tiltPose={rx:0,ry:0},tiltAim={rx:0,ry:0};
const COLORS={light:{board:'#f0f0f0',edge:'#dddddd',grain:'#00000003',nut:'#454545',fret:'#c4c4c4',marker:'#d2d2d2',label:'#747474',hover:'#222222',string:'#a0a0a0',playing:'#252525',selected:'#252525',ink:'#fafafa',ring:'#333333',pulse:'35,35,35',ghost:'#00000018',focus:'#333333'},dark:{board:'#292929',edge:'#3e3e3e',grain:'#ffffff03',nut:'#d4d4d4',fret:'#555555',marker:'#535353',label:'#a5a5a5',hover:'#f5f5f5',string:'#999999',playing:'#e5e5e5',selected:'#eeeeee',ink:'#242424',ring:'#ffffff',pulse:'235,235,235',ghost:'#ffffff20',focus:'#dddddd'}};
let C=COLORS[state.theme];
const canvas=$('fretboard'),ctx=canvas.getContext('2d'),wave=$('wave'),wctx=wave.getContext('2d');
let size={width:900,height:358},waveSize={width:200,height:63};
let camera=rangeCamera(...state.range),transition=null,frame=0,lastTime=0,hover=null,keyboard={string:1,fret:0},keyboardFocus=false;
let vibrations=[],pulses=[],lastPlayed=null,drag=null,moved=false,scheduled=[],audioSources=new Set(),playbackActive=false;
function layout(){const left=size.width<500?49:65,right=size.width<500?23:32,top=70,bottom=size.height-63;return {left,right: size.width-right,top,bottom,width:size.width-left-right,spacing:(bottom-top)/5};}
function sx(x){const l=layout();return l.left+(x-camera.left)/(camera.right-camera.left)*l.width;}
function sy(string){const l=layout();return l.top+(string-1)*l.spacing;}
function noteScreenX(fret){return fret===0?sx(0)-26:sx(noteX(fret));}
function openVisible(){const l=layout();return sx(0)>=l.left-2&&sx(0)<=l.right;}
function requestDraw(){if(!frame)frame=requestAnimationFrame(draw);}
function resize(){
  const dpr=Math.min(devicePixelRatio||1,3);
  const r={width:canvas.clientWidth,height:canvas.clientHeight};size={width:r.width,height:r.height};canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  const wr=wave.getBoundingClientRect();waveSize={width:wr.width,height:wr.height};wave.width=Math.round(wr.width*dpr);wave.height=Math.round(wr.height*dpr);wctx.setTransform(dpr,0,0,dpr,0,0);updatePoseLimits();requestDraw();
}
new ResizeObserver(resize).observe(canvas);new ResizeObserver(resize).observe(wave);

function setRange(start,end,animate=true){
  start=Number(start);end=Number(end);
  if(!validRange([start,end])){toast('镜头范围需要在 0—24 品内，结束品大于起始品。');return false;}
  state.range=[start,end];const target=rangeCamera(start,end);
  transition=animate&&!reduced?{from:{...camera},to:target,time:performance.now(),duration:850}:null;
  if(!transition)camera=target;updateRange();persist();requestDraw();return true;
}
function updateRange(){
  $('range-start').value=state.range[0];$('range-end').value=state.range[1];$('range-caption').textContent=state.range.join('—')+' 品';
  const target=rangeCamera(...state.range),normal=rangeCamera(0,12);$('zoom-ratio').textContent=((normal.right-normal.left)/(target.right-target.left)).toFixed(1)+'×';
  document.querySelectorAll('[data-range]').forEach(b=>b.classList.toggle('active',b.dataset.range===state.range.join(',')));
}
function draw(time){
  frame=0;const poseMoving=stepPose(time);lastTime=time;
  if(transition){const t=Math.min(1,(time-transition.time)/transition.duration),ease=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;camera.left=transition.from.left+(transition.to.left-transition.from.left)*ease;camera.right=transition.from.right+(transition.to.right-transition.from.right)*ease;if(t===1)transition=null;}
  vibrations=vibrations.filter(v=>time-v.time<1700);pulses=pulses.filter(p=>time-p.time<900);
  ctx.clearRect(0,0,size.width,size.height);const l=layout(),boardTop=l.top-23,boardBottom=l.bottom+23;
  // The camera moves in fretboard coordinates; strings and labels stay crisp at any zoom.
  ctx.save();ctx.beginPath();ctx.rect(l.left-50,15,l.width+57,size.height-35);ctx.clip();
  ctx.fillStyle=C.board;ctx.fillRect(sx(0),boardTop,sx(fretX(24))-sx(0),boardBottom-boardTop);
  ctx.strokeStyle=C.edge;ctx.lineWidth=1;ctx.strokeRect(sx(0),boardTop,sx(fretX(24))-sx(0),boardBottom-boardTop);
  // Subtle horizontal grain, drawn without photographic assets.
  for(let i=0;i<26;i++){ctx.beginPath();const y=boardTop+i*(boardBottom-boardTop)/26;ctx.moveTo(sx(0),y);ctx.lineTo(sx(fretX(24)),y+Math.sin(i*9)*1.7);ctx.strokeStyle=C.grain;ctx.lineWidth=.6;ctx.stroke();}
  for(let f=0;f<=24;f++){
    const x=sx(fretX(f));if(x<l.left-10||x>l.right+10)continue;
    ctx.beginPath();ctx.moveTo(x,boardTop);ctx.lineTo(x,boardBottom);ctx.strokeStyle=f===0?C.nut:C.fret;ctx.lineWidth=f===0?5:1.5;ctx.stroke();
    if(f>0){ctx.beginPath();ctx.moveTo(x+2,boardTop);ctx.lineTo(x+2,boardBottom);ctx.strokeStyle=C.grain;ctx.lineWidth=2;ctx.stroke();}
  }
  const markerY=(sy(3)+sy(4))/2;
  [3,5,7,9,12,15,17,19,21,24].forEach(f=>{const x=sx(noteX(f));if(x<l.left||x>l.right)return;ctx.fillStyle=C.marker;const ys=f%12===0?[sy(2)+(sy(3)-sy(2))/2,sy(4)+(sy(5)-sy(4))/2]:[markerY];ys.forEach(y=>{ctx.beginPath();ctx.arc(x,y,4.3,0,Math.PI*2);ctx.fill();});});
  ctx.textAlign='center';
  for(let f=1;f<=24;f++){
    const x=sx(noteX(f));if(x<l.left||x>l.right)continue;
    if(state.labels){for(let string=1;string<=6;string++){
      const n=midiAt(state.tuning,string,f),selected=state.selected.some(p=>p.string===string&&p.fret===f);
      if(selected)continue;
      const note=noteName(n),cellwidth=f===0?sx(0)-sx(-.057):sx(fretX(f))-sx(fretX(f-1));
      if(cellwidth<23)continue;
      const fontSize=Math.max(9,Math.min(15,cellwidth*.085));
      ctx.font=fontSize+'px "Space Grotesk", monospace';ctx.fillStyle=hover?.string===string&&hover.fret===f?C.hover:C.label;ctx.fillText(note,x,sy(string)-12);
    }}
  }
  // Open strings are independent dots beside the nut, without extra string segments.
  if(openVisible())for(let string=1;string<=6;string++){
    if(state.selected.some(p=>p.string===string&&p.fret===0))continue;
    const x=noteScreenX(0),y=sy(string),active=hover?.string===string&&hover.fret===0;
    ctx.beginPath();ctx.arc(x,y,active?Math.min(17,l.spacing*.41):3.5,0,Math.PI*2);ctx.strokeStyle=active?C.hover:C.marker;ctx.lineWidth=active?1.2:1;ctx.stroke();
    if(active){ctx.fillStyle=C.hover;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='12px monospace';ctx.fillText(noteName(midiAt(state.tuning,string,0)),x,y);ctx.textBaseline='alphabetic';}
  }
  if(hover&&hover.fret!==0){const x=noteScreenX(hover.fret),y=sy(hover.string);ctx.beginPath();ctx.arc(x,y,17,0,Math.PI*2);ctx.strokeStyle=C.marker;ctx.lineWidth=1;ctx.stroke();}
  // Each pluck starts at the chosen fret, with a decaying mixture of string harmonics.
  for(let string=1;string<=6;string++){
    const y=sy(string),v=[...vibrations].reverse().find(v=>v.string===string),elapsed=v?(time-v.time)/1000:5;
    const amplitude=v&&!reduced?7*Math.exp(-elapsed*3.5):0;
    const start=v?sx(fretX(v.fret)):sx(0),finish=sx(fretX(24)),length=finish-start;
    const lineStart=Math.max(l.left,sx(0)),lineEnd=Math.min(l.right,finish);
    for(let ghost=amplitude>.8?1:0;ghost>=0;ghost--){ctx.beginPath();
      for(let x=lineStart;x<=lineEnd+3;x+=3){const drawX=Math.min(x,lineEnd),part=length>0?(drawX-start)/length:0;const offset=part>0&&part<1?amplitude*(Math.sin(Math.PI*part)*Math.sin(elapsed*70+ghost*1.3)+.33*Math.sin(3*Math.PI*part)*Math.sin(elapsed*115)):0;
        if(x===lineStart)ctx.moveTo(drawX,y+offset);else ctx.lineTo(drawX,y+offset);
      }
      ctx.strokeStyle=ghost?C.ghost:v&&elapsed<.9?C.playing:C.string;ctx.lineWidth=.75+string*.2;ctx.globalAlpha=ghost?.35:.7;ctx.stroke();ctx.globalAlpha=1;
    }
  }
  pulses.forEach(p=>{if(p.fret===0&&!openVisible())return;const age=(time-p.time)/900,x=noteScreenX(p.fret),y=sy(p.string);ctx.beginPath();ctx.arc(x,y,15+age*26,0,Math.PI*2);ctx.strokeStyle=`rgba(${C.pulse},${(1-age)*.3})`;ctx.lineWidth=1;ctx.stroke();});
  state.selected.forEach(p=>drawNote(p,time));
  if(keyboardFocus&&(keyboard.fret!==0||openVisible())){const x=noteScreenX(keyboard.fret),y=sy(keyboard.string);ctx.beginPath();ctx.arc(x,y,21,0,Math.PI*2);ctx.setLineDash([3,3]);ctx.strokeStyle=C.focus;ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);}
  ctx.restore();
  drawWave(time);
  if(poseMoving||transition||vibrations.length||pulses.length||lastPlayed&&time-lastPlayed.time<2200)requestDraw();
}
function drawNote(p,time){
  const x=noteScreenX(p.fret),y=sy(p.string),l=layout();if(p.fret===0?!openVisible():x<l.left-10||x>l.right+10)return;
  const pulse=[...pulses].reverse().find(q=>q.string===p.string&&q.fret===p.fret),age=pulse?(time-pulse.time)/900:1;
  const cellwidth=p.fret===0?160:sx(fretX(p.fret))-sx(fretX(p.fret-1));
  const baseRadius=Math.min(Math.max(14,Math.min(22,cellwidth*.11)),l.spacing*.41);
  const radius=baseRadius+(pulse&&!reduced?Math.sin(Math.min(age*3,1)*Math.PI)*2:0);
  ctx.shadowColor=C.ghost;ctx.shadowBlur=pulse?(1-age)*16:5;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fillStyle=p.fret===0?C.board:C.selected;ctx.fill();ctx.shadowBlur=0;
  ctx.strokeStyle=p.fret===0?C.selected:C.ring;ctx.lineWidth=p.fret===0?1.5:.8;ctx.stroke();ctx.fillStyle=p.fret===0?C.hover:C.ink;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='500 '+Math.max(11,baseRadius*.65)+'px "Space Grotesk", monospace';ctx.fillText(noteName(midiAt(state.tuning,p.string,p.fret)),x,y+.5);ctx.textBaseline='alphabetic';
}
function drawWave(time){
  const {width:w,height:h}=waveSize;if(!w||!h)return;wctx.clearRect(0,0,w,h);const elapsed=lastPlayed?(time-lastPlayed.time)/1000:5,amplitude=Math.exp(-elapsed*2.4)*h*.4;
  wctx.strokeStyle=C.edge;wctx.lineWidth=1;wctx.beginPath();wctx.moveTo(0,h/2);wctx.lineTo(w,h/2);wctx.stroke();
  wctx.beginPath();for(let x=0;x<w;x+=2){const envelope=Math.sin(Math.PI*x/w),y=h/2+(!reduced?amplitude:0)*envelope*(Math.sin(x*.14-elapsed*20)+.3*Math.sin(x*.33+elapsed*13));x?wctx.lineTo(x,y):wctx.moveTo(x,y);}wctx.strokeStyle=C.string;wctx.lineWidth=1;wctx.stroke();
}

let audio=null,master=null,audioGeneration=0;const soundCache=new Map();
async function ensureAudio(){
  if(!audio){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('unsupported');audio=new Audio();master=audio.createGain();master.gain.value=.22;const limiter=audio.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=8;limiter.ratio.value=12;master.connect(limiter);limiter.connect(audio.destination);}
  if(audio.state==='suspended')await audio.resume();
}
function soundBuffer(midi){
    let buffer=soundCache.get(midi);
    if(!buffer){
      const sr=audio.sampleRate,length=Math.floor(sr*2.8),freq=frequency(midi),delay=sr/freq-.5,d=Math.floor(delay),fraction=delay-d;
      buffer=audio.createBuffer(1,length,sr);const samples=buffer.getChannelData(0);
      for(let i=0;i<=d+1;i++)samples[i]=(Math.random()*2-1)*.65;
      for(let i=d+2;i<length;i++){const a=samples[i-d]*(1-fraction)+samples[i-d-1]*fraction,b=samples[i-d-1]*(1-fraction)+samples[i-d-2]*fraction;samples[i]=.5*(a+b)*.9975;}
      const fade=Math.floor(sr*.04);for(let i=0;i<fade;i++)samples[length-i-1]*=i/fade;
      soundCache.set(midi,buffer);if(soundCache.size>80)soundCache.delete(soundCache.keys().next().value);
    }
    return buffer;
}
function scheduleSound(midi,when,gain=1,buffer=soundBuffer(midi)){
  const source=audio.createBufferSource(),voice=audio.createGain();source.buffer=buffer;voice.gain.value=gain;source.connect(voice);voice.connect(master);audioSources.add(source);source.onended=()=>{audioSources.delete(source);source.disconnect();voice.disconnect();};source.start(when);
}
async function playSound(midi){
  if(!state.sound)return;const generation=audioGeneration;
  try{await ensureAudio();if(generation===audioGeneration&&state.sound)scheduleSound(midi,audio.currentTime+.006);}
  catch{toast('此浏览器暂时无法发声，视觉演示仍可使用。');}
}
function pluck(p,time=performance.now(),withSound=true){
  const midi=midiAt(state.tuning,p.string,p.fret);
  vibrations.push({...p,time});pulses.push({...p,time});lastPlayed={...p,midi,time};
  $('last-note').textContent=noteName(midi);$('last-octave').textContent=octave(midi);$('last-position').textContent=p.string+' 弦 / '+(p.fret===0?'空弦':p.fret+' 品');$('frequency').textContent=frequency(midi).toFixed(2)+' Hz';
  if(withSound)playSound(midi);requestDraw();
}
function stopPlayback(){audioGeneration++;scheduled.forEach(clearTimeout);scheduled=[];audioSources.forEach(s=>{try{s.stop();}catch{}});audioSources.clear();playbackActive=false;$('stop-playback').disabled=true;$('playback-status').textContent='';}
async function replay(positions=state.selected,mode='chord'){
  stopPlayback();if(!positions.length)return;vibrations=[];pulses=[];
  const generation=audioGeneration,plan=playbackPlan(positions.slice(0,150),state.tuning,mode,state.tempo,state.direction);
  playbackActive=true;$('stop-playback').disabled=false;
  let ready=false;
  if(state.sound){try{await ensureAudio();if(generation!==audioGeneration)return;plan.forEach(p=>p.buffer=soundBuffer(p.midi));ready=true;}catch{toast('此浏览器暂时无法发声，视觉演示仍可使用。');}}
  if(generation!==audioGeneration)return;
  // Prepare every buffer before assigning one shared audio clock to the whole chord.
  const lead=35,startTime=performance.now()+lead,audioTime=ready?audio.currentTime+lead/1000:0;
  if(ready){const gain=1/Math.sqrt(Math.max(1,plan.length/4));plan.forEach(p=>scheduleSound(p.midi,audioTime+p.delay/1000,gain,p.buffer));}
  plan.forEach((p,i)=>scheduled.push(setTimeout(()=>{
    if(generation!==audioGeneration)return;pluck(p,startTime+p.delay,false);
    $('playback-status').textContent=mode==='chord'?'同时弹响 · '+plan.length+' 个音':'琶音 · '+(i+1)+' / '+plan.length;
  },lead+p.delay)));
  scheduled.push(setTimeout(()=>{if(generation===audioGeneration){playbackActive=false;$('stop-playback').disabled=true;$('playback-status').textContent='';scheduled=[];}},lead+plan.at(-1).delay+2800));
}
function selectPosition(p){
  stopPlayback();
  if(p.fret===0&&state.range[0]>1)setRange(0,Math.max(5,state.range[1]-state.range[0]));
  if(state.multi){
    const i=state.selected.findIndex(q=>q.string===p.string&&q.fret===p.fret);
    if(i>=0)state.selected.splice(i,1);else{state.selected.push(p);pulses.push({...p,time:performance.now()});}
  }else{state.selected=[p];pluck(p);}
  keyboard={...p};updateSelection();persist();requestDraw();
}
function updateSelection(){
  const list=$('selected-notes');list.replaceChildren();$('note-count').textContent=String(state.selected.length).padStart(2,'0');$('dock-note-count').textContent=state.selected.length;$('dock-note-count').hidden=!state.selected.length;$('replay').disabled=!state.selected.length;$('arpeggio').disabled=!state.selected.length;updateChord();$('selection-status').textContent='已选择 '+state.selected.length+' 个音符。';
  if(!state.selected.length){const empty=document.createElement('span');empty.className='empty-state';empty.textContent='你的音符会留在这里。';list.append(empty);return;}
  state.selected.forEach(p=>{const midi=midiAt(state.tuning,p.string,p.fret),button=document.createElement('button');button.className='note-chip';button.title=p.string+' 弦 '+(p.fret===0?'空弦':p.fret+' 品')+'；点击移除';button.setAttribute('aria-label',fullName(midi)+'，'+p.string+' 弦 '+p.fret+' 品，移除此标记');button.append(document.createTextNode(noteName(midi)));const small=document.createElement('small');small.textContent=p.string+':'+p.fret;const cross=document.createElement('b');cross.textContent='×';button.append(small,cross);button.addEventListener('click',()=>{stopPlayback();state.selected=state.selected.filter(q=>q!==p);updateSelection();persist();requestDraw();});list.append(button);});
}
function updateChord(){
  const chord=identifyChord(state.selected.map(p=>midiAt(state.tuning,p.string,p.fret)));
  $('chord-symbol').textContent=chord.symbol||'—';$('chord-description').textContent=chord.description;
  $('chord-alternatives').textContent=chord.alternatives.length?'也可理解为 '+chord.alternatives.join(' / '):'';
  $('chord-caption').hidden=!state.chordNames||chord.kind!=='chord';$('board-chord').textContent=chord.symbol;
}
function clearSelection(){stopPlayback();state.selected=[];vibrations=[];pulses=[];updateSelection();persist();requestDraw();}
function updateTuning(){
  hover=null;$('canvas-help').textContent='点击品格，听见它的位置。';
  canvas.setAttribute('aria-label','吉他指板。上下方向键选弦，左右方向键选品，回车选音，空格拨响。');
  $('tuning').value=state.preset;const title=PRESETS[state.preset]?.name||'CUSTOM';$('board-tuning').textContent=title;$('presentation-tuning').textContent=state.tuning.map(n=>noteName(n)).join(' · ');
  $('tuning-notes').replaceChildren();state.tuning.forEach((n,i)=>{const button=document.createElement('button');button.className='tuning-note';button.type='button';button.title=(6-i)+' 弦 '+fullName(n)+'，点击'+(state.multi?'选择':'试听')+'空弦';button.setAttribute('aria-label',button.title);button.append(document.createTextNode(noteName(n)));const sup=document.createElement('sup');sup.textContent=octave(n);button.append(sup);button.addEventListener('click',()=>selectPosition({string:6-i,fret:0}));$('tuning-notes').append(button);});
  updateSelection();requestDraw();
}
function changeTuning(notes,preset){stopPlayback();state.tuning=[...notes];state.preset=preset;vibrations=[];pulses=[];lastPlayed=null;$('last-note').textContent='—';$('last-octave').textContent='';$('last-position').textContent='调弦已更新，点一下指板';$('frequency').textContent='— Hz';updateTuning();persist();}

function centerOfBoard(){const r=anchor.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};}
function toLocal(event){const center=centerOfBoard(),u=(event.clientX-center.x-pose.x)/pose.scale,v=(event.clientY-center.y-pose.y)/pose.scale;const point=unprojectPoint(u,v,tiltPose.rx,tiltPose.ry);return {x:point.x+size.width/2,y:point.y+size.height/2};}
function hitAt(event){const {x,y}=toLocal(event),l=layout();if(y<l.top-l.spacing/2||y>l.bottom+l.spacing/2)return null;const string=clamp(Math.round((y-l.top)/l.spacing)+1,1,6);if(openVisible()&&Math.abs(x-noteScreenX(0))<=20)return {string,fret:0};if(x<Math.max(l.left,sx(0))||x>Math.min(l.right,sx(fretX(24))))return null;const world=camera.left+(x-l.left)/l.width*(camera.right-camera.left);for(let f=1;f<=24;f++)if(world<=fretX(f))return {string,fret:f};return null;}
function stepPose(time){
  const dt=clamp((time-lastTime)/1000,.001,.05),amount=reduced?1:1-Math.exp(-dt/0.065);let moving=false;
  for(const [current,target] of [[pose,poseAim],[tiltPose,tiltAim]])for(const k of Object.keys(current)){const difference=target[k]-current[k],tolerance=k==='rx'||k==='ry'?.00004:k==='scale'?.0001:.05;if(Math.abs(difference)>tolerance){current[k]+=difference*amount;moving=true;}else current[k]=target[k];}
  poseElement.style.transform=`translate(${pose.x}px,${pose.y}px) scale(${pose.scale})`;
  tiltElement.style.transform=`perspective(1200px) rotateX(${tiltPose.rx}rad) rotateY(${tiltPose.ry}rad)`;
  return moving;
}
function updatePoseLimits(){
  const xLimit=Math.round(innerWidth*.65),yLimit=Math.round(innerHeight*.55);
  for(const [id,limit] of [['board-x',xLimit],['board-y',yLimit]]){$(id).min=-limit;$(id).max=limit;}
  poseAim.x=clamp(poseAim.x,-xLimit,xLimit);poseAim.y=clamp(poseAim.y,-yLimit,yLimit);syncPoseControls();
}
function syncPoseControls(){
  $('board-scale').value=Math.round(poseAim.scale*100);$('scale-value').value=Math.round(poseAim.scale*100)+'%';
  $('board-x').value=Math.round(poseAim.x);$('x-value').value=Math.round(poseAim.x);$('board-y').value=Math.round(poseAim.y);$('y-value').value=Math.round(poseAim.y);
  state.view={...poseAim};
}
let viewPersistTimer;
function movePose(next){poseAim={...poseAim,...next};poseAim.scale=clamp(poseAim.scale,.55,2.2);poseAim.x=clamp(poseAim.x,-innerWidth*.65,innerWidth*.65);poseAim.y=clamp(poseAim.y,-innerHeight*.55,innerHeight*.55);syncPoseControls();requestDraw();clearTimeout(viewPersistTimer);viewPersistTimer=setTimeout(persist,180);}
function zoomPose(scale,point=centerOfBoard()){movePose(anchoredZoom(poseAim,scale,point,centerOfBoard()));}
function resetView(){movePose({x:0,y:0,scale:1});tiltAim={rx:0,ry:0};}
const pointers=new Map();let pinch=null,pinchUsed=false;
function startPinch(){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},view:{...poseAim}};pinchUsed=true;drag=null;}
function followPointer(event){if(!state.tilt||reduced||drag||pinch)return;const c=centerOfBoard();tiltAim={rx:clamp(-(event.clientY-c.y)/Math.max(180,size.height),-1,1)*.105,ry:clamp((event.clientX-c.x)/Math.max(250,size.width/2),-1,1)*.122};requestDraw();}
surface.addEventListener('pointerdown',event=>{
  if(event.button!==0&&event.pointerType!=='touch')return;
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});surface.setPointerCapture(event.pointerId);
  tiltAim={...tiltPose};hover=null;
  if(pointers.size===2){startPinch();return;}
  if(event.target===canvas){canvas.focus({preventScroll:true});keyboardFocus=false;}
  drag={x:event.clientX,y:event.clientY,view:{...poseAim},pointer:event.pointerId};moved=false;
});
surface.addEventListener('pointermove',event=>{
  if(pointers.has(event.pointerId))pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(pinch&&pointers.size>=2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y),center={x:(a.x+b.x)/2,y:(a.y+b.y)/2},next=anchoredZoom(pinch.view,pinch.view.scale*distance/Math.max(1,pinch.distance),pinch.center,centerOfBoard());movePose({...next,x:next.x+center.x-pinch.center.x,y:next.y+center.y-pinch.center.y});return;}
  if(drag&&event.pointerId===drag.pointer){const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.hypot(dx,dy)>5)moved=true;if(moved){surface.classList.add('dragging');movePose({x:drag.view.x+dx,y:drag.view.y+dy});return;}}
  if(event.pointerType!=='touch')followPointer(event);
  hover=hitAt(event);canvas.style.cursor=hover?'pointer':'grab';requestDraw();
});
function finishPointer(event,cancelled=false){
  if(!pointers.has(event.pointerId))return;
  if(!cancelled&&!pinchUsed&&drag&&!moved){const p=hitAt(event);if(p)selectPosition(p);}
  pointers.delete(event.pointerId);drag=null;pinch=null;surface.classList.remove('dragging');if(!pointers.size)pinchUsed=false;
  if(event.pointerType!=='touch')followPointer(event);persist();
}
surface.addEventListener('pointerup',event=>finishPointer(event));surface.addEventListener('pointercancel',event=>finishPointer(event,true));
surface.addEventListener('pointerleave',()=>{if(!drag&&!pinch)tiltAim={rx:0,ry:0};hover=null;requestDraw();});
let nativeGesture=null;
surface.addEventListener('wheel',event=>{
  event.preventDefault();if(nativeGesture)return;
  const intent=wheelIntent(event);
  if(intent.type==='zoom')zoomPose(poseAim.scale*intent.factor,{x:event.clientX,y:event.clientY});
  else movePose({x:poseAim.x+intent.x,y:poseAim.y+intent.y});
},{passive:false});
surface.addEventListener('gesturestart',event=>{event.preventDefault();nativeGesture={scale:poseAim.scale};tiltAim={...tiltPose};},{passive:false});
surface.addEventListener('gesturechange',event=>{event.preventDefault();if(!nativeGesture||!Number.isFinite(event.scale))return;zoomPose(nativeGesture.scale*event.scale,Number.isFinite(event.clientX)&&Number.isFinite(event.clientY)?{x:event.clientX,y:event.clientY}:centerOfBoard());},{passive:false});
surface.addEventListener('gestureend',event=>{event.preventDefault();nativeGesture=null;persist();},{passive:false});
for(const [id,key] of [['board-x','x'],['board-y','y']])$(id).addEventListener('input',()=>movePose({[key]:Number($(id).value)}));
$('board-scale').addEventListener('input',()=>zoomPose(Number($('board-scale').value)/100));$('reset-view').addEventListener('click',resetView);

canvas.addEventListener('keydown',event=>{
  if(!canHandleShortcut(event,{allowRepeat:true})||(event.key==='Enter'&&event.repeat))return;
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(event.key))return;event.preventDefault();keyboardFocus=true;
  if(event.key==='ArrowUp')keyboard.string=Math.max(1,keyboard.string-1);if(event.key==='ArrowDown')keyboard.string=Math.min(6,keyboard.string+1);if(event.key==='ArrowLeft')keyboard.fret=Math.max(0,keyboard.fret-1);if(event.key==='ArrowRight')keyboard.fret=Math.min(24,keyboard.fret+1);if(event.key==='Enter')selectPosition({...keyboard});
  if(keyboard.fret<(state.range[0]<=1?0:state.range[0])||keyboard.fret>state.range[1]){const width=state.range[1]-state.range[0],start=Math.max(0,Math.min(24-width,keyboard.fret-Math.floor(width/2)));setRange(start,start+width);}
  canvas.setAttribute('aria-label',keyboard.string+' 弦 '+keyboard.fret+' 品 '+fullName(midiAt(state.tuning,keyboard.string,keyboard.fret))+'。上下选弦，左右选品，回车选音，空格拨响。');requestDraw();
});
canvas.addEventListener('blur',()=>{keyboardFocus=false;requestDraw();});

$('tuning').addEventListener('change',event=>{const preset=event.target.value;if(preset==='custom'){openTuning();$('tuning').value=state.preset;}else changeTuning(PRESETS[preset].notes,preset);});
$('customize').addEventListener('click',openTuning);
function openTuning(){const fields=$('custom-tuning-fields');fields.replaceChildren();state.tuning.forEach((n,i)=>{const label=document.createElement('label');label.textContent=(6-i)+' 弦'+(i===0?' · 低音':i===5?' · 高音':'');const input=document.createElement('input');input.value=fullName(n);input.name='string-'+(6-i);input.required=true;input.maxLength=4;input.setAttribute('aria-label',(6-i)+' 弦音高');label.append(input);fields.append(label);});$('tuning-error').textContent='';$('tuning-dialog').showModal();}
$('tuning-form').addEventListener('submit',event=>{event.preventDefault();try{const notes=[...$('custom-tuning-fields').querySelectorAll('input')].map(i=>parsePitch(i.value).midi);changeTuning(notes,'custom');$('tuning-dialog').close();toast('自定义调弦已应用。');}catch(error){$('tuning-error').textContent=error.message;}});
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>$(button.dataset.close).close()));
function setInputMode(mode){state.inputMode=mode;const position=mode==='position';$('input-position').classList.toggle('active',position);$('input-note').classList.toggle('active',!position);$('input-position').setAttribute('aria-pressed',position);$('input-note').setAttribute('aria-pressed',!position);$('note-input').value='';$('note-input').placeholder=position?'6:0  5:2  4:2':'C  E  G  或  F#3';$('input-hint').textContent=position?'弦:品，例如 2:3；多个位置用空格分隔。':'在当前镜头内标记音名；加八度可指定音高。';$('input-error').textContent='';}
$('input-position').addEventListener('click',()=>setInputMode('position'));$('input-note').addEventListener('click',()=>setInputMode('note'));
$('note-form').addEventListener('submit',event=>{event.preventDefault();try{const visibleStart=state.range[0]<=1?0:state.range[0],positions=state.inputMode==='position'?parsePositions($('note-input').value):findNotes($('note-input').value,state.tuning,visibleStart,state.range[1]);stopPlayback();state.selected=positions;if(state.inputMode==='position'&&positions.some(p=>p.fret<visibleStart||p.fret>state.range[1])){const max=Math.max(...positions.map(p=>p.fret));setRange(0,max>12?24:12);}updateSelection();persist();$('input-error').textContent='';if(!state.multi)replay();requestDraw();}catch(error){$('input-error').textContent=error.message;}});
$('apply-range').addEventListener('click',()=>setRange($('range-start').value,$('range-end').value));
['range-start','range-end'].forEach(id=>$(id).addEventListener('keydown',event=>{if(event.key==='Enter')setRange($('range-start').value,$('range-end').value);}));
document.querySelectorAll('[data-range]').forEach(button=>button.addEventListener('click',()=>setRange(...button.dataset.range.split(',').map(Number))));$('reset-camera').addEventListener('click',()=>setRange(0,12));
for(const key of ['labels','tilt','sound','chordNames'])$(key).addEventListener('click',()=>{state[key]=!state[key];$(key).classList.toggle('active',state[key]);$(key).setAttribute('aria-pressed',state[key]);if(key==='sound'&&!state.sound)stopPlayback();if(key==='tilt'&&!state.tilt)tiltAim={rx:0,ry:0};if(key==='chordNames')updateChord();persist();requestDraw();});
$('clear').addEventListener('click',clearSelection);$('replay').addEventListener('click',()=>replay());$('arpeggio').addEventListener('click',()=>replay(state.selected,'arpeggio'));$('stop-playback').addEventListener('click',()=>{stopPlayback();vibrations=[];pulses=[];requestDraw();});
$('arp-tempo').addEventListener('input',()=>{stopPlayback();state.tempo=Number($('arp-tempo').value);$('tempo-value').value=state.tempo+' BPM';persist();});
$('arp-direction').addEventListener('change',()=>{stopPlayback();state.direction=$('arp-direction').value;persist();});
$('open-strings').addEventListener('click',()=>{stopPlayback();state.selected=Array.from({length:6},(_,i)=>({string:6-i,fret:0}));if(state.range[0]>1)setRange(0,12);updateSelection();persist();if(!state.multi)replay();requestDraw();});
const tools=mountTools({document,window,onReveal(){document.body.classList.remove('recording');tiltAim={rx:0,ry:0};requestDraw();}});
let shortcutStorage;try{shortcutStorage=window.localStorage;}catch{}
mountShortcuts({document,navigator,storage:shortcutStorage,onOpen:()=>tools.select('shortcuts')});
function setMode(multi){state.multi=multi;updateButtons();updateTuning();persist();}
$('multi').addEventListener('click',()=>setMode(true));$('single').addEventListener('click',()=>setMode(false));
function applyTheme(theme){state.theme=theme;C=COLORS[theme];document.documentElement.dataset.theme=theme;document.querySelector('meta[name="theme-color"]').content=theme==='dark'?'#212121':'#fafafa';updateButtons();persist();requestDraw();}
$('theme-light').addEventListener('click',()=>applyTheme('light'));$('theme-dark').addEventListener('click',()=>applyTheme('dark'));
function togglePresentation(force){const active=force??!document.body.classList.contains('recording');document.body.classList.toggle('recording',active);if(active){tools.close();canvas.focus({preventScroll:true});toast('录屏模式 · 按 P 恢复工具栏');tiltAim={rx:0,ry:0};requestDraw();}}
$('present').addEventListener('click',()=>togglePresentation());$('exit-present').addEventListener('click',()=>togglePresentation(false));
document.addEventListener('keydown',event=>{
  if(document.querySelector('dialog[open]'))return;
  const action=shortcutAction(event);if(!action)return;
  event.preventDefault();
  if(action==='presentation')togglePresentation();
  if(action==='play')replay();
  if(action==='arpeggio')replay(state.selected,'arpeggio');
  if(action==='escape'){if(playbackActive){stopPlayback();vibrations=[];pulses=[];requestDraw();}else if(document.body.classList.contains('recording'))togglePresentation(false);else clearSelection();}
  if(action==='reset')resetView();
});

function renderScenes(){
  $('scene-count').textContent=state.scenes.length;const list=$('scene-list');list.replaceChildren();
  if(!state.scenes.length){const p=document.createElement('p');p.textContent='还没有保存的场景。音符、调弦和镜头会一起保存。';list.append(p);}
  state.scenes.forEach(scene=>{const row=document.createElement('div');row.className='saved-scene';const load=document.createElement('button');load.type='button';load.append(document.createTextNode(scene.name));const small=document.createElement('small');small.textContent=scene.tuning.map(n=>noteName(n)).join(' · ')+' / '+scene.range.join('—')+' 品';load.append(small);load.addEventListener('click',()=>{changeTuning(scene.tuning,PRESETS[scene.preset]?scene.preset:'custom');state.selected=validPositions(scene.selected);state.labels=scene.labels!==false;state.multi=scene.uiVersion===2?scene.multi!==false:true;state.chordNames=scene.chordNames!==false;if(Number.isFinite(scene.tempo))state.tempo=clamp(scene.tempo,40,240);if(['up','down','selection'].includes(scene.direction))state.direction=scene.direction;if(validView(scene.view))movePose(scene.view);setRange(...scene.range);updateButtons();updateSelection();persist();$('scene-dialog').close();requestDraw();toast('已载入「'+scene.name+'」。');});const remove=document.createElement('button');remove.className='icon-button';remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','删除场景 '+scene.name);remove.addEventListener('click',()=>{state.scenes=state.scenes.filter(s=>s.id!==scene.id);persist();renderScenes();});row.append(load,remove);list.append(row);});
}
$('save-scene').addEventListener('click',()=>{$('scene-form').hidden=false;renderScenes();$('scene-dialog').showModal();$('scene-name').focus();});
$('load-scene').addEventListener('click',()=>{$('scene-form').hidden=true;renderScenes();$('scene-dialog').showModal();});
$('scene-form').addEventListener('submit',event=>{event.preventDefault();const name=$('scene-name').value.trim();if(!name){$('scene-name').setCustomValidity('请输入场景名称。');$('scene-name').reportValidity();return;}state.scenes.unshift({uiVersion:2,view:{...poseAim},id:crypto.randomUUID(),name,tuning:[...state.tuning],preset:state.preset,selected:state.selected.map(p=>({...p})),range:[...state.range],labels:state.labels,multi:state.multi,chordNames:state.chordNames,tempo:state.tempo,direction:state.direction});state.scenes=state.scenes.slice(0,50);persist();renderScenes();$('scene-name').value='';$('scene-dialog').close();toast(storageAvailable?'场景已保存在这个浏览器。':'场景已暂存，浏览器未允许持久保存。');});
$('scene-name').addEventListener('input',()=>$('scene-name').setCustomValidity(''));
function updateButtons(){
  for(const key of ['labels','multi','tilt','sound','chordNames']){$(key).classList.toggle('active',state[key]);$(key).setAttribute('aria-pressed',state[key]);}
  $('single').classList.toggle('active',!state.multi);$('single').setAttribute('aria-pressed',!state.multi);
  $('mode-caption').textContent=state.multi?'多音选择':'单音试听';$('mode-help').textContent=state.multi?'点击添加，再点取消。Space 同时弹响，A 播放琶音。':'点击一个音，直接试听；每次保留一个标记。';
  $('arp-tempo').value=state.tempo;$('tempo-value').value=state.tempo+' BPM';$('arp-direction').value=state.direction;
  for(const theme of ['light','dark']){$('theme-'+theme).classList.toggle('active',state.theme===theme);$('theme-'+theme).setAttribute('aria-pressed',state.theme===theme);}
}
updateButtons();updateTuning();updateRange();renderScenes();resize();persist();

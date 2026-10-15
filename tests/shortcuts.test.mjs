import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {detectPlatform,shortcutRows,shortcutAction,canHandleShortcut,mountShortcuts} from '../dist/shortcuts.mjs';
import {mountTools} from '../dist/tools.mjs';

test('platform detection supports Client Hints, Safari and Firefox fallbacks, and does not mistake iPad for Mac',()=>{
  for(const [nav,expected] of [
    [{userAgentData:{platform:'Windows'},platform:'Linux x86_64'},'windows'],
    [{platform:'Win32'},'windows'],[{platform:'MacIntel',maxTouchPoints:0},'mac'],
    [{platform:'MacIntel',maxTouchPoints:5,userAgent:'Macintosh'},'ios'],
    [{platform:'iPhone'},'ios'],[{userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'},'windows'],
    [{userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'},'mac'],
    [{platform:'Linux armv8l',userAgent:'Android'},'android'],[{platform:'Linux x86_64'},'linux'],[{},'unknown']
  ])assert.equal(detectPlatform(nav),expected);
});

test('system key combinations, IME composition, held action keys and editable descendants keep their native behavior',()=>{
  const {document}=parseHTML('<body><div contenteditable="true"><span id="editing"></span></div><button id="button"></button><a id="link"></a><input id="input"></body>');
  const event={target:document.body,key:'a'};
  assert.equal(shortcutAction(event),'arpeggio');
  for(const mod of [{ctrlKey:true},{metaKey:true},{altKey:true},{isComposing:true},{keyCode:229},{repeat:true},{defaultPrevented:true}])assert.equal(shortcutAction({...event,...mod}),null);
  for(const id of ['editing','input'])assert.equal(shortcutAction({...event,target:document.getElementById(id)}),null);
  for(const id of ['button','link'])assert.equal(shortcutAction({...event,key:' ',code:'Space',target:document.getElementById(id)}),null);
  assert.equal(shortcutAction({...event,key:'C'}),'tools');assert.equal(shortcutAction({...event,key:'?'}),'help');
  assert.equal(canHandleShortcut({...event,key:'ArrowRight',repeat:true},{allowRepeat:true}),true);
});

test('help, platform override and view hint stay in sync and preserve the nine circular tools',async()=>{
  const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
  const {document,window}=parseHTML(html),get=id=>document.getElementById(id);window.innerWidth=514;
  let focused=document.body;Object.defineProperty(document,'activeElement',{get:()=>focused});
  for(const node of document.querySelectorAll('button,input,select,canvas'))node.focus=()=>{focused=node;};
  get('tools-toggle').getBoundingClientRect=()=>({right:498});
  // A minimal select value shim: LinkeDOM has no native select setter.
  let selectValue='auto';Object.defineProperty(get('shortcut-platform'),'value',{get:()=>selectValue,set:v=>{selectValue=v;}});
  const saved=new Map(),storage={getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)};
  const tools=mountTools({document,window});
  mountShortcuts({document,navigator:{platform:'MacIntel'},storage,onOpen:()=>tools.select('shortcuts')});
  assert.match(get('platform-status').textContent,/macOS.*自动识别/);assert.match(get('gesture-hint').textContent,/⌘/);
  assert.match(get('shortcut-rows').textContent,/Return/);assert.equal(get('shortcut-rows').children.length,shortcutRows('mac').length);
  tools.open();get('tool-shortcuts').click();assert.equal(get('controls').hidden,false);assert.equal(get('tool-title').textContent,'快捷键');
  assert.equal(document.querySelector('[data-panel="shortcuts"]').hidden,false);
  get('shortcut-platform').value='windows';get('shortcut-platform').dispatchEvent(new window.Event('change'));
  assert.match(get('gesture-hint').textContent,/Ctrl/);assert.doesNotMatch(get('gesture-hint').textContent,/⌘/);assert.match(get('shortcut-rows').textContent,/Enter/);assert.equal(saved.get('fret-note-shortcut-platform'),'windows');
  get('shortcut-platform').value='auto';get('shortcut-platform').dispatchEvent(new window.Event('change'));assert.match(get('gesture-hint').textContent,/⌘/);
  tools.close();const event=new window.Event('keydown',{bubbles:true,cancelable:true});Object.assign(event,{key:'?'});document.body.dispatchEvent(event);assert.equal(event.defaultPrevented,true);assert.equal(get('controls').hidden,false);assert.equal(focused.id,'close-controls');
  assert.equal(get('tool-dock').querySelectorAll('.dock-button').length,9);
});

test('help still works when the browser denies local storage',async()=>{
  const {document}=parseHTML(await readFile(new URL('../dist/index.html',import.meta.url),'utf8'));
  let value='';Object.defineProperty(document.getElementById('shortcut-platform'),'value',{get:()=>value,set:v=>{value=v;}});
  assert.doesNotThrow(()=>mountShortcuts({document,storage:{getItem(){throw Error('denied');}},onOpen(){}}));
  assert.match(document.getElementById('platform-status').textContent,/通用/);
  assert.match(document.getElementById('gesture-hint').textContent,/Ctrl \/ ⌘/);
});

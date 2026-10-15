import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {mountTools} from '../dist/tools.mjs';

const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
function setup(){
  const {document,window}=parseHTML(html);window.innerWidth=514;
  let focused=document.body,reveals=0;
  Object.defineProperty(document,'activeElement',{get:()=>focused});
  // LinkeDOM has no layout or browser focus manager; track only the requested
  // focus target. The DOM, events, attributes and selectors are real fixtures.
  for(const node of document.querySelectorAll('button,input,select,canvas'))node.focus=()=>{focused=node;};
  const get=id=>document.getElementById(id);get('tools-toggle').getBoundingClientRect=()=>({right:498});
  const tools=mountTools({document,window,onReveal(){reveals++;}});
  function key(target,name,modifiers={}){const event=new window.Event('keydown',{bubbles:true,cancelable:true});Object.assign(event,{key:name,ctrlKey:false,metaKey:false,altKey:false,...modifiers});target.dispatchEvent(event);return event;}
  return {document,window,get,tools,key,reveals:()=>reveals};
}
test('tools start collapsed, expand to all nine icons, and switch to a single settings panel',()=>{
  const t=setup();assert.equal(t.tools.isOpen(),false);assert.equal(t.get('tool-dock').hidden,true);assert.equal(t.get('tools-toggle').getAttribute('aria-expanded'),'false');
  t.get('tools-toggle').click();assert.equal(t.get('tool-dock').hidden,false);assert.equal(t.get('tool-dock').querySelectorAll('.dock-button').length,9);assert.equal(t.get('tool-shortcuts').hidden,false);assert.equal(t.get('tools-toggle-label').textContent,'收起');
  t.get('tool-appearance').click();assert.equal(t.get('tool-dock').hidden,true);assert.equal(t.get('controls').hidden,false);assert.equal(t.get('tool-title').textContent,'外观');assert.equal(t.get('tool-appearance').getAttribute('aria-expanded'),'true');assert.equal(t.document.activeElement.id,'close-controls');assert.equal(t.get('controls').style.left,'138px');
  for(const section of t.document.querySelectorAll('[data-panel]'))assert.equal(section.hidden,section.dataset.panel!=='appearance');
  t.get('close-controls').click();assert.equal(t.get('controls').hidden,true);assert.equal(t.get('tool-dock').hidden,false);assert.equal(t.document.activeElement.id,'tool-appearance');
  t.get('tools-toggle').click();assert.equal(t.tools.isOpen(),false);assert.equal(t.get('tools-toggle').getAttribute('aria-expanded'),'false');assert.equal(t.reveals(),3);
});
test('grid arrow navigation and Escape move focus without leaving an invisible focused button',()=>{
  const t=setup();const launcher=t.get('tools-toggle');t.key(launcher,'ArrowDown');assert.equal(t.document.activeElement.id,'controls-toggle');
  const ids=['tool-playback','tool-frets','tool-playback','present','tool-scenes'];
  for(const [i,key] of ['ArrowRight','ArrowDown','ArrowUp','End','ArrowLeft'].entries()){t.key(t.document.activeElement,key);assert.equal(t.document.activeElement.id,ids[i]);}
  const escape=t.key(t.document.activeElement,'Escape');assert.equal(escape.defaultPrevented,true);assert.equal(t.tools.isOpen(),false);assert.equal(t.document.activeElement,launcher);
  t.key(launcher,'ArrowUp');assert.equal(t.document.activeElement.id,'present');
});
test('outside clicks close tools, C toggles them, and text inputs keep their typing shortcuts',()=>{
  const t=setup();const body=t.document.body;
  t.key(body,'c');assert.equal(t.tools.isOpen(),true);assert.equal(t.document.activeElement.id,'controls-toggle');
  const inside=new t.window.Event('pointerdown',{bubbles:true});t.get('tool-appearance').dispatchEvent(inside);assert.equal(t.tools.isOpen(),true);
  t.get('fretboard').dispatchEvent(new t.window.Event('pointerdown',{bubbles:true}));assert.equal(t.tools.isOpen(),false);
  t.key(t.get('note-input'),'c');assert.equal(t.tools.isOpen(),false);t.key(body,'c',{ctrlKey:true});assert.equal(t.tools.isOpen(),false);
  t.tools.select('notes');t.key(t.get('note-input'),'Escape');assert.equal(t.tools.isOpen(),false);assert.equal(t.document.activeElement.id,'tools-toggle');
  t.tools.open();t.get('scene-dialog').setAttribute('open','');const escape=t.key(t.get('scene-name'),'Escape');assert.equal(escape.defaultPrevented,false);assert.equal(t.tools.isOpen(),true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {detectLanguage,mountI18n,translate} from '../dist/i18n.mjs';
import {mountTools} from '../dist/tools.mjs';
import {mountShortcuts,shortcutRows} from '../dist/shortcuts.mjs';
import {identifyChord} from '../dist/chords.mjs';
import {parsePositions} from '../dist/music.mjs';
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
function setup(nav={},saved){
 const {document,window}=parseHTML(html);window.innerWidth=1000;
 for(const select of document.querySelectorAll('select')){let value=select.querySelector('option')?.value||'';Object.defineProperty(select,'value',{get:()=>value,set:v=>value=v});}
 const values=new Map(saved?[['fret-note-language',saved]]:[]),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const i18n=mountI18n({document,navigator:nav,storage});return {document,window,storage,values,i18n,get:id=>document.getElementById(id)};
}
test('browser language detection, saved preference, automatic mode and denied storage have predictable fallbacks',()=>{
 assert.equal(detectLanguage({languages:['fr-FR','en-GB']}),'en');assert.equal(detectLanguage({language:'zh-TW'}),'zh');assert.equal(detectLanguage({language:'fr'}),'zh');
 const t=setup({language:'en-US'},'zh');assert.equal(t.i18n.language,'zh');t.i18n.setLanguage('en');assert.equal(t.values.get('fret-note-language'),'en');assert.equal(t.document.documentElement.lang,'en');
 t.i18n.setLanguage('auto');assert.equal(t.i18n.language,'en');assert.equal(t.get('language-select').value,'auto');
 const {document}=parseHTML(html);Object.defineProperty(document.getElementById('language-select'),'value',{value:'auto',writable:true});assert.doesNotThrow(()=>mountI18n({document,navigator:{language:'en'},storage:{getItem(){throw Error('denied');}}}));
});
test('English translates the whole static interface, metadata, placeholders and accessible labels while preserving form values',()=>{
 const t=setup({language:'en'});t.get('note-input').value='x 3 2 0 1 0';
 const missing=[];function visit(node){if(node.nodeType===1&&node.matches('script,style,[data-native-language]'))return;if(node.nodeType===3&&/\p{Script=Han}/u.test(node.nodeValue))missing.push(node.nodeValue);if(node.nodeType===1)for(const attr of ['aria-label','title','placeholder','content'])if(/\p{Script=Han}/u.test(node.getAttribute(attr)||''))missing.push(node.getAttribute(attr));for(const child of node.childNodes||[])visit(child);}
 visit(t.document.documentElement);assert.deepEqual(missing,[]);
 assert.match(t.get('scene-name').placeholder,/Opening chords/);assert.match(t.get('fretboard').getAttribute('aria-label'),/Guitar fretboard/);
 t.i18n.setLanguage('zh');assert.equal(t.get('note-input').value,'x 3 2 0 1 0');assert.equal(t.get('tool-playback').querySelector('span').textContent,'播放');t.i18n.setLanguage('en');assert.equal(t.get('tool-playback').querySelector('span').textContent,'Playback');
});
test('open tool titles and system shortcut hints update live when the language changes',()=>{
 const t=setup({language:'en'});t.get('tools-toggle').getBoundingClientRect=()=>({right:980});
 const tools=mountTools({document:t.document,window:t.window,translate:t.i18n.t});t.i18n.subscribe(tools.refresh);
 mountShortcuts({document:t.document,navigator:{platform:'MacIntel'},storage:t.storage,i18n:t.i18n,onOpen:()=>tools.select('shortcuts')});tools.select('shortcuts');
 assert.equal(t.get('tool-title').textContent,'Shortcuts');assert.match(t.get('gesture-hint').textContent,/scroll wheel/);assert.match(t.get('platform-status').textContent,/Current system/);
 t.i18n.setLanguage('zh');assert.equal(t.get('tool-title').textContent,'快捷键');assert.match(t.get('gesture-hint').textContent,/滚轮/);assert.equal(t.get('tools-toggle-label').textContent,'收起');
 assert.equal(shortcutRows('windows','en').at(-1)[1],'Ctrl + scroll wheel');
});
test('localizing chord explanations never changes symbols, alternatives, bass interpretation or source pitches',()=>{
 for(const pitches of [[],[40],[48,52,55],[52,55,60],[50,53,60],[48,49,50],[48,52],[48,52,55,57]]){
  const zh=identifyChord(pitches),en=identifyChord(pitches,'en');assert.equal(en.symbol,zh.symbol);assert.deepEqual(en.alternatives,zh.alternatives);assert.deepEqual(en.notes,zh.notes);assert.doesNotMatch(en.description,/\p{Script=Han}/u);
 }
 assert.match(identifyChord([52,55,60],'en').description,/E in the bass/);
 assert.match(identifyChord([50,53,60],'en').description,/fifth omitted/);
});
test('validation and parameterized notices use readable English without changing user-authored values',()=>{
 let error;try{parsePositions('6:99');}catch(e){error=e.message;}assert.match(translate(error,'en'),/Frets must be 0–24/);
 assert.equal(translate('已载入「{name}」。','en',{name:'我的场景'}),'Loaded “我的场景”.');
 assert.equal(translate('已选择 {count} 个音符。','en',{count:1}),'1 note selected.');
 assert.equal(translate('琶音 · {index} / {count}','en',{index:2,count:5}),'Arpeggio · 2 / 5');
});

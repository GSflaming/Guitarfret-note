import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {parseHTML} from 'linkedom';
import {mountNotice} from '../dist/notice.mjs';
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
function setup(){
 const {document}=parseHTML(html),tasks=new Map();let next=0,dismissed=0;
 const timers={setTimeout(fn,ms){tasks.set(++next,{fn,ms});return next;},clearTimeout(id){tasks.delete(id);}};
 const notice=mountNotice({document,timers,onDismiss(){dismissed++;}});
 return {document,tasks,notice,get:id=>document.getElementById(id),dismissed:()=>dismissed};
}
test('recording hint can be dismissed without leaving recording mode, and a new hint preserves the close button',()=>{
 const t=setup();t.document.body.classList.add('recording');t.notice.show('录屏模式 · 按 P 恢复工具栏');assert.equal(t.get('toast').hidden,false);assert.match(t.get('toast-message').textContent,/录屏模式/);
 Object.defineProperty(t.document,'activeElement',{get:()=>t.get('toast-close')});t.get('toast-close').click();assert.equal(t.get('toast').hidden,true);assert.equal(t.tasks.size,0);assert.equal(t.document.body.classList.contains('recording'),true);assert.equal(t.dismissed(),1);
 t.notice.show('下一条提示');assert.equal(t.get('toast').hidden,false);assert.equal(t.get('toast-message').textContent,'下一条提示');assert.ok(t.get('toast-close'));assert.equal(t.tasks.size,1);
});
test('replacing a notice clears its prior timeout and automatic dismissal still works',()=>{
 const t=setup();assert.equal(t.get('toast').hidden,true);t.notice.show('first');t.notice.show('second');assert.equal(t.tasks.size,1);const task=[...t.tasks.values()][0];assert.equal(task.ms,2600);task.fn();assert.equal(t.get('toast').hidden,true);assert.equal(t.tasks.size,0);
});

import {shortcutAction,canHandleShortcut} from './shortcuts.mjs';
// Tool disclosure is independent of the canvas, note selection and audio.
export function mountTools({document:doc,window:win,onReveal=()=>{}}){
  const get=id=>doc.getElementById(id),launcher=get('tools-toggle'),menu=get('tool-dock'),panel=get('controls');
  const tools=[...menu.querySelectorAll('[data-tool]')];
  let activeTool='selection';
  const isOpen=()=>!menu.hidden||!panel.hidden;
  function sync(){
    const open=isOpen();launcher.setAttribute('aria-expanded',String(open));launcher.setAttribute('aria-label',open?'收起指板工具':'展开指板工具');launcher.title=open?'收起工具 · C':'展开工具 · C';get('tools-toggle-label').textContent=open?'收起':'工具';
    tools.forEach(button=>button.setAttribute('aria-expanded',String(!panel.hidden&&button.dataset.tool===activeTool)));
  }
  function close(focus=false){menu.hidden=true;panel.hidden=true;sync();if(focus)launcher.focus({preventScroll:true});}
  function open(focus=false){panel.hidden=true;menu.hidden=false;onReveal();sync();if(focus)tools[0].focus({preventScroll:true});}
  function toggle(focus=false){if(isOpen())close(focus);else open(focus);}
  function positionPanel(){
    const width=Math.min(360,win.innerWidth-32),right=launcher.getBoundingClientRect().right;
    panel.style.left=Math.max(16,Math.min(right-width,win.innerWidth-width-16))+'px';
  }
  function select(tool){
    const button=tools.find(b=>b.dataset.tool===tool);if(!button)throw new Error('未知的工具。');
    activeTool=tool;menu.hidden=true;panel.hidden=false;
    doc.querySelectorAll('[data-panel]').forEach(section=>section.hidden=section.dataset.panel!==tool);
    get('tool-title').textContent=button.querySelector('span').textContent;
    onReveal();positionPanel();sync();get('close-controls').focus({preventScroll:true});
  }
  launcher.addEventListener('click',event=>toggle(event.detail===0));
  launcher.addEventListener('keydown',event=>{
    if(!canHandleShortcut(event,{allowRepeat:true}))return;
    if(!['ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();open();const buttons=[...menu.querySelectorAll('.dock-button')];buttons[event.key==='ArrowUp'?buttons.length-1:0].focus({preventScroll:true});
  });
  tools.forEach(button=>button.addEventListener('click',()=>select(button.dataset.tool)));
  get('close-controls').addEventListener('click',()=>{open();tools.find(b=>b.dataset.tool===activeTool).focus({preventScroll:true});});
  menu.addEventListener('keydown',event=>{
    if(!canHandleShortcut(event,{allowRepeat:true}))return;
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    const buttons=[...menu.querySelectorAll('.dock-button')],index=buttons.indexOf(doc.activeElement);if(index<0)return;
    event.preventDefault();const step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-3,ArrowDown:3}[event.key];
    const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+step+buttons.length)%buttons.length;buttons[next].focus({preventScroll:true});
  });
  doc.addEventListener('pointerdown',event=>{if(isOpen()&&!event.target.closest?.('#tools-toggle,#tool-dock,#controls,dialog'))close();});
  doc.addEventListener('keydown',event=>{
    if(event.defaultPrevented||event.isComposing||event.keyCode===229||doc.querySelector('dialog[open]'))return;
    if(event.key==='Escape'&&isOpen()){event.preventDefault();close(true);return;}
    if(event.target.matches?.('input,textarea,select'))return;
    if(shortcutAction(event)==='tools'){event.preventDefault();toggle(true);}
  });
  win.addEventListener('resize',()=>{if(!panel.hidden)positionPanel();});
  close();
  return Object.freeze({open,close,toggle,select,isOpen});
}

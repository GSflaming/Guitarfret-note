import {translate} from './i18n.mjs';
// Platform hints only affect presentation. No UA information leaves the browser.
export function detectPlatform(nav={}){
  const ua=nav.userAgent||'',platform=nav.userAgentData?.platform||nav.platform||'';
  if(/android/i.test(platform+' '+ua))return 'android';
  if(/iPhone|iPad|iPod/i.test(platform+' '+ua)||(/^Mac/i.test(platform)&&nav.maxTouchPoints>1))return 'ios';
  if(/mac/i.test(platform)||(!platform&&/Macintosh/i.test(ua)))return 'mac';
  if(/win/i.test(platform)||(!platform&&/Windows/i.test(ua)))return 'windows';
  if(/linux/i.test(platform+' '+ua))return 'linux';
  return 'unknown';
}
export const platformName=platform=>({mac:'macOS',windows:'Windows',ios:'iPad / iPhone',android:'Android',linux:'Linux',unknown:'通用'}[platform]||'通用');
export function canHandleShortcut(event,{allowRepeat=false}={}){
  return !event.defaultPrevented&&!event.isComposing&&event.keyCode!==229&&(!event.repeat||allowRepeat)&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]');
}
export function shortcutAction(event){
  if(!canHandleShortcut(event))return null;
  if(event.code==='Space'||event.key===' '){
    return event.target?.closest?.('button,a,[role="button"]')?null:'play';
  }
  return ({c:'tools',a:'arpeggio',p:'presentation','0':'reset',Escape:'escape','?':'help'})[event.key?.length===1?event.key.toLowerCase():event.key]||null;
}
export function shortcutRows(platform,language='zh'){
  const mac=platform==='mac';
  return [
    ['展开／收起工具','C'],['同时弹响','Space 空格'],['播放琶音','A'],
    ['进入／退出录屏模式','P'],['复位指板位置和大小','0'],['打开快捷键表','?'],
    ['收起／停止／退出／清空',mac?'⎋ Esc':'Esc'],
    ['选弦和选品（指板聚焦时）','↑ ↓ ← →'],['选中／取消音符（指板聚焦时）',mac?'↩ Return':'Enter'],
    ['移动控件焦点','Tab / Shift + Tab'],['工具菜单首项／末项','Home / End'],
    ['鼠标缩放指板',mac?'⌘ + 滚轮':platform==='unknown'?'Ctrl / ⌘ + 滚轮':'Ctrl + 滚轮']
  ].map(row=>row.map(text=>translate(text,language)));
}
export function mountShortcuts({document:doc,navigator:nav={},storage,onOpen,i18n}){
  const get=id=>doc.getElementById(id),select=get('shortcut-platform'),detected=detectPlatform(nav),storageKey='fret-note-shortcut-platform';
  const t=(text,values)=>i18n?i18n.t(text,values):translate(text,'zh',values),name=p=>t(platformName(p));
  let override='auto';try{const saved=storage?.getItem(storageKey);if(['mac','windows'].includes(saved))override=saved;}catch{}
  function render(){
    const platform=override==='auto'?detected:override;
    select.value=override;
    get('platform-status').textContent=override==='auto'?t('当前设备：{platform} · 自动识别',{platform:name(detected)}):t('按 {platform} 显示 · 当前设备：{detected}',{platform:name(platform),detected:name(detected)});
    doc.querySelectorAll('[data-platform-label]').forEach(node=>node.textContent=name(platform));
    const rows=shortcutRows(platform,i18n?.language),body=get('shortcut-rows');body.replaceChildren();
    for(const [action,keys] of rows){const row=doc.createElement('tr'),name=doc.createElement('th'),cell=doc.createElement('td'),kbd=doc.createElement('kbd');name.scope='row';name.textContent=action;kbd.textContent=keys;cell.append(kbd);row.append(name,cell);body.append(row);}
    get('shortcut-typing-hint').textContent=t('字母键直接按，无需 {modifier}；输入文字或使用输入法时不会触发。',{modifier:platform==='mac'?'⌘':platform==='unknown'?'Ctrl / ⌘':'Ctrl'});
    const hint=get('gesture-hint');hint.replaceChildren(doc.createTextNode(t('双指滑动平移 · 捏合缩放')),doc.createElement('br'),doc.createTextNode(t('鼠标拖动平移 · {keys}缩放',{keys:rows.at(-1)[1]})));
  }
  select.addEventListener('change',()=>{override=['mac','windows'].includes(select.value)?select.value:'auto';try{storage?.setItem(storageKey,override);}catch{}render();});
  doc.addEventListener('keydown',event=>{
    if(shortcutAction(event)!=='help'||doc.querySelector('dialog[open]'))return;
    event.preventDefault();onOpen();
  });
  i18n?.subscribe(render);render();return {detected,render};
}

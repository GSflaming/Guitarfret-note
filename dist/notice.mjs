export function mountNotice({document:doc,timers=globalThis,onDismiss=()=>{}}){
  const host=doc.getElementById('toast'),message=doc.getElementById('toast-message'),close=doc.getElementById('toast-close');
  let timeout;
  function hide(){
    timers.clearTimeout(timeout);timeout=undefined;
    const hadFocus=doc.activeElement===close;
    host.classList.remove('show');host.hidden=true;
    if(hadFocus)onDismiss();
  }
  function show(text){
    timers.clearTimeout(timeout);message.textContent=text;host.hidden=false;host.classList.add('show');
    timeout=timers.setTimeout(hide,2600);
  }
  close.addEventListener('click',hide);hide();
  return Object.freeze({show,hide});
}

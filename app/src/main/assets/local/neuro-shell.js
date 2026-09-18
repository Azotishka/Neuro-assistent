(() => {
  const pending = new Map(); let seq = 0;
  function call(op, text = '') {
    if (!window.NeuroNative) return Promise.resolve({handled:false});
    return new Promise((resolve, reject) => {
      const id = String(++seq);
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('Android не ответил. Повтори действие.')); }, 15000);
      pending.set(id, {resolve, timer});
      NeuroNative.postMessage(JSON.stringify({id,op,text}));
    });
  }
  if (window.NeuroNative) NeuroNative.onmessage = event => {
    try { const data = JSON.parse(event.data); const item = pending.get(data.id);
      if(item) { clearTimeout(item.timer); pending.delete(data.id); item.resolve(data); }
    } catch (_) {}
  };
  const notice = text => window.QwenUI?.toast ? window.QwenUI.toast(text) : alert(text);
  window.NeuroShell = {
    notice,
    setPrompt(text) { const el = document.getElementById('prompt'); if(el) { el.value=text; el.dispatchEvent(new Event('input',{bubbles:true})); el.focus(); } },
    async command(text) {
      try { const result = await call('command', text); return result; }
      catch(e) { notice(e.message); return {handled:true,reply:e.message}; }
    }
  };
  document.addEventListener('DOMContentLoaded', () => {
    document.title = 'NeuroAssistant';
    const bar = document.createElement('nav'); bar.className='neuro-toolbar'; bar.setAttribute('aria-label','Помощник Android');
    const buttons = [['Голос','voice'],['Кнопка телефона','role'],['API и настройки','settings'],['Ожидание','background'],['Выключить ожидание','stopBackground']];
    buttons.forEach(([label,op]) => { const b=document.createElement('button'); b.textContent=label; b.type='button';
      b.onclick=async()=>{ try { const result=await call(op); if(result.reply||result.error) notice(result.reply||result.error); } catch(e) {notice(e.message);} }; bar.append(b); });
    document.querySelector('.topbar')?.after(bar);
    const style=document.createElement('style'); style.textContent='.neuro-toolbar{display:flex;gap:8px;padding:10px 14px;overflow-x:auto;flex-shrink:0}.neuro-toolbar button{white-space:nowrap;border:1px solid var(--border,#444);border-radius:16px;padding:10px 14px;background:var(--surface,#252535);color:inherit;min-height:44px}'; document.head.append(style);
  });
})();

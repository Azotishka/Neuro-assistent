(() => {
  if (!window.NeuroNative) return;
  const pending = new Map();
  let seq = 0;
  let cloudBusy = false;
  let mode = localStorage.getItem('neuro:mode') === 'cloud' ? 'cloud' : 'local';
  function call(op, payload = {}) {
    return new Promise((resolve, reject) => {
      const id = String(++seq);
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('Превышено время ожидания Android.')); }, op === 'cloud' ? 115000 : 15000);
      pending.set(id, {resolve, timer});
      try { NeuroNative.postMessage(JSON.stringify({id, op, ...payload})); }
      catch (error) { clearTimeout(timer); pending.delete(id); reject(error); }
    });
  }
  NeuroNative.onmessage = event => {
    try {
      const data = JSON.parse(event.data);
      const item = pending.get(data.id);
      if (item) { clearTimeout(item.timer); pending.delete(data.id); item.resolve(data); }
    } catch (error) { console.warn('Android bridge response', error); }
  };
  const notice = text => window.QwenUI?.toast ? window.QwenUI.toast(text) : alert(text);
  const errorText = result => result?.error ? String(result.error) : '';
  window.NeuroShell = {
    notice,
    get mode() { return mode; },
    setPrompt(text) {
      const el = document.getElementById('prompt');
      if (el) { el.value = text; el.dispatchEvent(new Event('input', {bubbles:true})); el.focus(); }
      document.querySelector('[data-route="chat"]')?.click();
    },
    async command(text) {
      const result = await call('command', {text});
      if (result.error) throw new Error(errorText(result));
      return result;
    },
    async cloudReply(content, history) {
      if (cloudBusy) { notice('Ответ API уже загружается'); return false; }
      cloudBusy = true;
      try {
        const messages = [...history.slice(-29), {role:'user', content}].map(item => ({role:item.role, content:String(item.content || '').slice(0,9000)}));
        const result = await call('cloud', {messages});
        if (result.error) throw new Error(errorText(result));
        await window.NeuroQwenCore.appendDirectAnswer(content, result.reply, 'API · ' + (document.getElementById('neuroModel')?.value || 'облако'));
        return true;
      } catch (error) { notice('API: ' + error.message); return false; }
      finally { cloudBusy = false; }
    }
  };
  function setMode(next) {
    mode = next;
    localStorage.setItem('neuro:mode', next);
    document.querySelectorAll('[data-neuro-mode]').forEach(button => {
      const active = button.dataset.neuroMode === next;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.getElementById('neuroModeHint').textContent = next === 'cloud' ? 'API: запросы отправляются выбранному провайдеру' : 'Локально: модель работает на устройстве';
  }
  async function loadSettings() {
    try {
      const result = await call('getSettings');
      if (result.error) throw new Error(errorText(result));
      document.getElementById('neuroUrl').value = result.baseUrl || '';
      document.getElementById('neuroModel').value = result.model || '';
      document.getElementById('neuroKey').placeholder = result.hasKey ? 'Ключ сохранён на устройстве' : 'API-ключ';
    } catch (error) { notice(error.message); }
  }
  async function migrateChats() {
    if (localStorage.getItem('neuro:legacy-imported') === '1') return;
    // Wait for the IndexedDB-backed Qwen workspace, then import each old native conversation once.
    for (let attempt = 0; attempt < 80 && !window.NeuroQwenCore?.getCurrentChat(); attempt++) await new Promise(resolve => setTimeout(resolve, 100));
    const core = window.NeuroQwenCore;
    if (!core?.createChatFromMessages || core.getCurrentChat()?.id === 'volatile') return;
    try {
      const result = await call('legacyChats');
      if (result.error) throw new Error(errorText(result));
      const existing = core.getChats();
      for (const chat of result.chats || []) {
        if (!chat.messages?.length || existing.some(item => item.metadata?.nativeId === chat.id)) continue;
        const seed = chat.messages.filter(item => ['user','assistant'].includes(item.role)).map(item => ({role:item.role, content:item.content, createdAt:item.createdAt}));
        if (seed.length) await core.createChatFromMessages(seed, {title:chat.title || 'Старый чат'});
        const current = core.getCurrentChat();
        if (current) { current.metadata = {...current.metadata, nativeId:chat.id}; await core.saveCurrentChat(); }
      }
      localStorage.setItem('neuro:legacy-imported', '1');
    } catch (error) { console.warn('Chat migration', error); }
  }
  document.addEventListener('DOMContentLoaded', () => {
    document.title = 'NeuroAssistant';
    document.querySelector('.brand h1').textContent = 'NeuroAssistant';
    document.querySelector('.brand .eyebrow').textContent = 'ИИ-ПОМОЩНИК / ANDROID';
    const intro = document.querySelector('.intro-main');
    if (intro) {
      intro.querySelector('.intro-label').textContent = 'ЛОКАЛЬНЫЙ ИИ И API В ОДНОМ ЧАТЕ';
      intro.querySelector('h2').innerHTML = 'Твой ассистент.<br>Всегда под рукой.';
      intro.querySelector('p').textContent = 'Выбери локальную модель или свой API, затем общайся в одном чате. Голос, история и команды Android доступны в том же приложении.';
    }
    const homeCard = document.querySelector('.home-primary-card');
    if (homeCard) {
      homeCard.querySelector('h3').textContent = 'Начни разговор с ассистентом.';
      homeCard.querySelector('p').textContent = 'Локальная модель требует WebGPU и загрузки весов. Если WebGPU недоступен, настрой API в разделе выше.';
    }
    const bar = document.createElement('section');
    bar.className = 'neuro-panel';
    bar.innerHTML = `<div class="neuro-modes" role="group" aria-label="Режим ответа"><button type="button" data-neuro-mode="local">На устройстве</button><button type="button" data-neuro-mode="cloud">Через API</button><button type="button" id="neuroVoice" aria-label="Диктовать">🎙</button></div><small id="neuroModeHint"></small><details class="neuro-details"><summary>Настроить API и кнопку телефона</summary><div class="neuro-fields"><label>HTTPS-адрес провайдера<input id="neuroUrl" type="url" inputmode="url" autocomplete="off" placeholder="https://api.openai.com/v1"></label><label>Модель<input id="neuroModel" type="text" autocomplete="off" placeholder="Название модели"></label><label>API-ключ<input id="neuroKey" type="password" autocomplete="off" placeholder="API-ключ"></label><button id="neuroSave" type="button">Сохранить API</button><small>При выборе API история последних сообщений передаётся провайдеру. Ключ хранится в защищённом хранилище Android.</small><div class="neuro-actions"><button type="button" data-neuro-op="role">Выбрать ассистентом</button><button type="button" data-neuro-op="background">Ожидание</button><button type="button" data-neuro-op="stopBackground">Выключить ожидание</button></div><small>Кнопка ассистента настраивается в Android. Ожидание показывает уведомление; постоянное прослушивание выключено.</small></div></details>`;
    document.querySelector('.topbar')?.after(bar);
    const style = document.createElement('style');
    style.textContent = `.neuro-panel{padding:9px 14px;background:var(--paper);border-bottom:1px solid var(--soft-line);color:var(--ink)}.neuro-modes{display:flex;gap:6px}.neuro-panel button{min-height:40px;border:1px solid var(--soft-line);border-radius:12px;padding:8px 12px;background:var(--surface);color:var(--ink);font:inherit}.neuro-modes button:first-child,.neuro-modes button:nth-child(2){flex:1}.neuro-panel button.active,.neuro-panel #neuroSave{background:var(--ink);color:var(--paper)}.neuro-panel small{display:block;color:var(--muted);font-size:11px;margin-top:6px}.neuro-details{margin-top:7px}.neuro-details summary{cursor:pointer;padding:5px 0;font-size:12px}.neuro-fields{display:grid;gap:9px;padding:10px 0}.neuro-fields label{font-size:11px}.neuro-fields input{display:block;width:100%;min-height:44px;margin-top:4px;border:1px solid var(--soft-line);border-radius:10px;padding:8px;background:var(--surface);color:var(--ink);font-size:14px}.neuro-actions{display:flex;flex-wrap:wrap;gap:5px}.neuro-actions button{flex:1;font-size:11px}`;
    document.head.append(style);
    setMode(mode);
    if (!navigator.gpu && mode === 'local') document.querySelector('.neuro-details').open = true;
    document.querySelectorAll('[data-neuro-mode]').forEach(button => button.onclick = () => setMode(button.dataset.neuroMode));
    document.getElementById('neuroVoice').onclick = async () => { try { const r = await call('voice'); if(r.error) notice(r.error); } catch(e) {notice(e.message);} };
    document.getElementById('neuroSave').onclick = async () => {
      const button = document.getElementById('neuroSave'); button.disabled = true;
      try {
        const result = await call('saveSettings', {baseUrl:document.getElementById('neuroUrl').value, model:document.getElementById('neuroModel').value, apiKey:document.getElementById('neuroKey').value});
        if (result.error) throw new Error(errorText(result));
        document.getElementById('neuroKey').value = '';
        notice('API сохранён. Выбери «Через API» для ответа.');
        await loadSettings();
      } catch (error) { notice(error.message); }
      finally { button.disabled = false; }
    };
    document.querySelectorAll('[data-neuro-op]').forEach(button => button.onclick = async () => {
      try { const result = await call(button.dataset.neuroOp); if(result.reply || result.error) notice(result.reply || result.error); }
      catch (error) { notice(error.message); }
    });
    loadSettings();
    migrateChats();
  });
})();

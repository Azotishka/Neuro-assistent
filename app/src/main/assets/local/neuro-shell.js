(() => {
  if (!window.NeuroNative) return;
  const pending = new Map();
  let seq = 0;
  let cloudBusy = false;
  let backgroundActive = false;
  let audioSaveTimer = 0;
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
  function setBackgroundCard(enabled, starting = false, message = '') {
    backgroundActive = !!enabled;
    const card = document.getElementById('neuroLiveCard');
    if (!card) return;
    card.hidden = !(enabled || starting);
    card.classList.toggle('starting', starting && !enabled);
    const title = card.querySelector('[data-live-title]');
    const subtitle = card.querySelector('[data-live-subtitle]');
    const stop = card.querySelector('[data-live-stop]');
    if (title) title.textContent = enabled ? 'Фоновый режим включён' : 'Включаю Live-режим…';
    if (subtitle) subtitle.textContent = message || (enabled ? 'Нажми кнопку ассистента для нового голосового запроса' : 'Запрашиваю разрешение Android');
    if (stop) stop.hidden = !enabled;
  }
  function scheduleAudioSave() {
    clearTimeout(audioSaveTimer);
    audioSaveTimer = setTimeout(async () => {
      try {
        const result = await call('saveAudioSettings', {
          autoSpeak: !!document.getElementById('neuroAutoSpeak')?.checked,
          speechVolume: Number(document.getElementById('neuroVolume')?.value || 1),
          speechRate: Number(document.getElementById('neuroRate')?.value || 1),
        });
        if (result.error) throw new Error(errorText(result));
      } catch (error) { notice('Звук: ' + error.message); }
    }, 260);
  }
  window.NeuroShell = {
    notice,
    setBackgroundState(enabled, message = '') { setBackgroundCard(!!enabled, false, message); },
    get mode() { return mode; },
    setPrompt(text) {
      const el = document.getElementById('prompt');
      if (el) { el.value = text; el.dispatchEvent(new Event('input', {bubbles:true})); el.focus(); }
      document.querySelector('[data-route="chat"]')?.click();
    },
    handleBack() {
      const dialog = [...document.querySelectorAll('dialog[open]')].at(-1);
      if (dialog) { dialog.close(); return true; }
      const settings = document.querySelector('.neuro-details');
      if (settings?.open) { settings.open = false; return true; }
      if (document.body.dataset.page !== 'chat') {
        document.querySelector('[data-route="chat"]')?.click();
        return true;
      }
      return false;
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
      const autoSpeak = document.getElementById('neuroAutoSpeak');
      const volume = document.getElementById('neuroVolume');
      const rate = document.getElementById('neuroRate');
      if (autoSpeak) autoSpeak.checked = !!result.autoSpeak;
      if (volume) { volume.value = String(result.speechVolume ?? 1); document.getElementById('neuroVolumeValue').textContent = `${Math.round(Number(volume.value) * 100)}%`; }
      if (rate) { rate.value = String(result.speechRate ?? 1); document.getElementById('neuroRateValue').textContent = `${Number(rate.value).toFixed(1)}×`; }
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
    style.textContent += `.neuro-live-card{display:flex;align-items:center;gap:10px;margin:8px 0;padding:12px;border:1px solid var(--soft-line);border-radius:18px;background:color-mix(in srgb,var(--surface) 92%,var(--blue) 8%);animation:neuroLiveIn .28s ease both}.neuro-live-card[hidden]{display:none}.neuro-live-orb{position:relative;width:42px;height:42px;flex:0 0 42px;border-radius:50%;background:#67f6a3;box-shadow:0 0 0 8px color-mix(in srgb,#67f6a3 18%,transparent);animation:neuroLivePulse 1.15s ease-in-out infinite}.neuro-live-card.starting .neuro-live-orb{background:var(--yellow);animation-duration:.8s}.neuro-live-copy{min-width:0;flex:1}.neuro-live-copy b,.neuro-live-copy small{display:block}.neuro-live-copy b{font-size:12px}.neuro-live-copy small{margin-top:3px}.neuro-live-stop{min-height:34px!important;padding:6px 9px!important;font-size:11px!important}@keyframes neuroLivePulse{0%,100%{transform:scale(.82);box-shadow:0 0 0 5px color-mix(in srgb,#67f6a3 14%,transparent)}50%{transform:scale(1.08);box-shadow:0 0 0 14px color-mix(in srgb,#67f6a3 2%,transparent)}}@keyframes neuroLiveIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}.neuro-audio{display:grid;gap:6px;padding-top:9px;border-top:1px solid var(--soft-line)}.neuro-audio label{display:grid;grid-template-columns:1fr auto;align-items:center;gap:7px}.neuro-audio input[type=range]{width:100%;accent-color:var(--blue);min-height:28px}.neuro-audio output{font-weight:800}`;
    document.head.append(style);
    const liveCard = document.createElement('div');
    liveCard.id = 'neuroLiveCard';
    liveCard.className = 'neuro-live-card';
    liveCard.hidden = true;
    liveCard.innerHTML = `<div class="neuro-live-orb" aria-hidden="true"></div><div class="neuro-live-copy"><b data-live-title>Фоновый режим включён</b><small data-live-subtitle>Нажми кнопку ассистента для нового голосового запроса</small></div><button type="button" class="neuro-live-stop" data-live-stop data-neuro-op="stopBackground" hidden>Выкл.</button>`;
    document.querySelector('.neuro-details')?.before(liveCard);
    const audio = document.createElement('div');
    audio.className = 'neuro-audio';
    audio.innerHTML = `<label><span>Озвучка ответов</span><input id="neuroAutoSpeak" type="checkbox"></label><label><span>Громкость <output id="neuroVolumeValue">100%</output></span><input id="neuroVolume" type="range" min="0" max="1" step="0.05" value="1"></label><label><span>Скорость речи <output id="neuroRateValue">1.0×</output></span><input id="neuroRate" type="range" min="0.65" max="1.35" step="0.05" value="1"></label>`;
    document.querySelector('.neuro-fields')?.append(audio);
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
      const op = button.dataset.neuroOp;
      if (op === 'background') setBackgroundCard(false, true);
      try {
        const result = await call(op);
        if (op === 'background') setBackgroundCard(!!result.enabled, !!result.pending, result.reply || '');
        if (op === 'stopBackground') setBackgroundCard(false, false, 'Фоновый режим выключен');
        if(result.reply || result.error) notice(result.reply || result.error);
      } catch (error) { if (op === 'background') setBackgroundCard(false, false, error.message); notice(error.message); }
    });
    document.getElementById('neuroAutoSpeak')?.addEventListener('change', scheduleAudioSave);
    document.getElementById('neuroVolume')?.addEventListener('input', event => { document.getElementById('neuroVolumeValue').textContent = `${Math.round(Number(event.target.value) * 100)}%`; scheduleAudioSave(); });
    document.getElementById('neuroRate')?.addEventListener('input', event => { document.getElementById('neuroRateValue').textContent = `${Number(event.target.value).toFixed(1)}×`; scheduleAudioSave(); });
    loadSettings();
    migrateChats();
  });
})();

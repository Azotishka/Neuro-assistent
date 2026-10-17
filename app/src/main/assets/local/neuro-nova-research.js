(()=> {
  const esc = s => String(s ?? "");
  const style = document.createElement('style');
  style.textContent = `
  #nnResearchBtn{min-height:40px;padding:0 13px;border:1px solid var(--nn-line);border-radius:13px;background:var(--nn-panel);color:var(--nn-text);font-weight:700}
  #nnResearchPanel{width:min(760px,calc(100vw - 24px));max-height:min(84dvh,850px);border:1px solid var(--nn-line);border-radius:24px;background:var(--nn-bg);color:var(--nn-text);padding:0;box-shadow:0 24px 80px #0005}
  #nnResearchPanel::backdrop{background:#080b13a8;backdrop-filter:blur(5px)}
  .nnr-head{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid var(--nn-line)}
  .nnr-head h2{font-size:20px;margin:0}.nnr-body{padding:18px;overflow:auto;max-height:calc(84dvh - 76px)}
  .nnr-row{display:flex;gap:8px;margin:10px 0}.nnr-input{min-width:0;flex:1;border:1px solid var(--nn-line);border-radius:13px;background:var(--nn-panel);color:var(--nn-text);padding:12px}.nnr-textarea{width:100%;min-height:78px;resize:vertical;border:1px solid var(--nn-line);border-radius:13px;background:var(--nn-panel);color:var(--nn-text);padding:12px;font:inherit}
  .nnr-btn{border:0;border-radius:12px;padding:11px 14px;background:var(--nn-accent);color:white;font-weight:750}.nnr-secondary{background:var(--nn-panel-2);color:var(--nn-text);border:1px solid var(--nn-line)}
  .nnr-note{font-size:12px;line-height:1.5;color:var(--nn-muted)}.nnr-results{display:grid;gap:10px;margin-top:14px}
  .nnr-result{border:1px solid var(--nn-line);background:var(--nn-panel);border-radius:16px;padding:14px}.nnr-result h3{font-size:15px;margin:0 0 7px}.nnr-result p{font-size:13px;line-height:1.5;color:var(--nn-muted);margin:0 0 10px;overflow-wrap:anywhere}.nnr-result a{color:var(--nn-accent);font-size:12px;overflow-wrap:anywhere}
  .nnr-status{white-space:pre-wrap;font-size:13px;color:var(--nn-muted);margin:12px 0}
  @media(max-width:650px){#nnResearchBtn{padding:0 10px}.nnr-body{padding:13px}.nnr-row{flex-wrap:wrap}.nnr-input{flex-basis:100%}}
  `;
  document.head.append(style);
  document.addEventListener('DOMContentLoaded', () => {
    const actions=document.querySelector('.top-actions');
    if(!actions || document.getElementById('nnResearchBtn')) return;
    const open=document.createElement('button'); open.id='nnResearchBtn';open.type='button';open.textContent='⌕ Поиск';
    const dlg=document.createElement('dialog');dlg.id='nnResearchPanel';
    dlg.innerHTML=`<div class="nnr-head"><div><div class="eyebrow">NEURO NOVA · RESEARCH</div><h2>Поиск и база знаний</h2></div><button class="round-btn" id="nnrClose" type="button" aria-label="Закрыть">×</button></div>
      <div class="nnr-body">
        <p class="nnr-note">Поиск проверяет Wikipedia на русском и английском. Можно импортировать до 10 HTTPS-ссылок за один запуск. Страницы индексируются в локальную базу знаний и добавляются в контекст по релевантности; это расширяет доступные знания, но не переобучает веса языковой модели.</p>
        <form id="nnrSearchForm"><label for="nnrQuery">Найти в интернете</label><div class="nnr-row"><input id="nnrQuery" class="nnr-input" placeholder="Тема, вопрос или термин" minlength="2" maxlength="240" required><button class="nnr-btn" type="submit">Искать</button></div></form>
        <label for="nnrUrl">Изучить прямые ссылки (по одной в строке, до 10)</label><div class="nnr-row"><textarea id="nnrUrl" class="nnr-textarea" rows="3" placeholder="https://example.org/article&#10;https://ru.wikipedia.org/wiki/..." ></textarea></div><div class="nnr-row"><button class="nnr-btn nnr-secondary" id="nnrImport" type="button">Импортировать и индексировать</button></div>
        <div class="nnr-row"><input id="nnrLocalQuery" class="nnr-input" placeholder="Поиск по сохранённым знаниям"><button class="nnr-btn nnr-secondary" id="nnrLocalSearch" type="button">В базе</button></div>
        <div id="nnrStatus" class="nnr-status" role="status">Готово к поиску.</div><div id="nnrResults" class="nnr-results"></div>
      </div>`;
    document.body.append(dlg);actions.prepend(open);
    const status=dlg.querySelector('#nnrStatus'),results=dlg.querySelector('#nnrResults');
    const setStatus=s=>status.textContent=s;
    const addResult=(title,snippet,url,actionLabel,action)=>{
      const card=document.createElement('article');card.className='nnr-result';
      const h=document.createElement('h3');h.textContent=title;
      const p=document.createElement('p');p.textContent=snippet||'Описание отсутствует.';
      const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=url;
      const b=document.createElement('button');b.type='button';b.className='nnr-btn nnr-secondary';b.style.marginLeft='10px';b.textContent=actionLabel;
      b.addEventListener('click',action);card.append(h,p,a,b);results.append(card);
    };
    const requireBridge=()=>{if(!window.NeuroStudio)throw new Error('Нативный модуль ещё не готов. Перезапусти приложение и проверь подключение.');};
    open.addEventListener('click',()=>{dlg.showModal();dlg.querySelector('#nnrQuery').focus()});
    dlg.querySelector('#nnrClose').addEventListener('click',()=>dlg.close());
    dlg.querySelector('#nnrSearchForm').addEventListener('submit',async e=>{
      e.preventDefault();results.replaceChildren();setStatus('Ищу в Wikipedia…');
      try{requireBridge();const items=await window.NeuroStudio.searchWeb(dlg.querySelector('#nnrQuery').value,8);
        if(!items.length){setStatus('Ничего не найдено. Попробуй более короткий запрос.');return}
        setStatus('Найдено: '+items.length+'. Выбери источник, чтобы добавить его в базу знаний.');
        items.forEach(it=>addResult(it.title,it.snippet,it.url,'Изучить',async()=>{
          bussy(true);try{const r=await window.NeuroStudio.fetchUrl(it.url);setStatus('Источник сохранён: '+it.title+'\nФрагментов: '+r.chunks+'\nТеперь можно искать по сохранённым знаниям.');}
          catch(err){setStatus('Не удалось загрузить источник: '+err.message)}finally{bussy(false)}
        }));
      }catch(err){setStatus('Ошибка поиска: '+err.message)}
    });
    function bussy(on){dlg.querySelectorAll('button').forEach(b=>{if(b.id!=='nnrClose')b.disabled=on})}
    dlg.querySelector('#nnrImport').addEventListener('click',async()=>{
      const urls=[...new Set(dlg.querySelector('#nnrUrl').value.split(/[\\n,;]+/).map(x=>x.trim()).filter(Boolean))];
      if(!urls.length){setStatus('Вставь хотя бы одну HTTPS-ссылку.');return}
      if(urls.length>10){setStatus('За один запуск можно импортировать не более 10 ссылок.');return}
      if(urls.some(u=>!u.toLowerCase().startsWith('https://'))){setStatus('Каждая ссылка должна начинаться с https://');return}
      results.replaceChildren();bussy(true);let ok=0,failed=[];
      try{requireBridge();for(let i=0;i<urls.length;i++){
        setStatus('Индексирую источник '+(i+1)+' из '+urls.length+'…');
        try{const r=await window.NeuroStudio.fetchUrl(urls[i]);ok++;const card=document.createElement('article');card.className='nnr-result';const h=document.createElement('h3');h.textContent='Источник '+ok+' сохранён';const p=document.createElement('p');p.textContent=r.url+'\\nФрагментов: '+r.chunks;card.append(h,p);results.append(card)}
        catch(err){failed.push(urls[i]+' — '+err.message)}
      }
      setStatus('Готово: '+ok+' из '+urls.length+' источников индексировано. '+(failed.length?'Ошибки:\\n'+failed.join('\\n'):'Знания сохранены на устройстве.'));
      }catch(err){setStatus('Ошибка импорта: '+err.message)}
      finally{bussy(false)}
    });
    dlg.querySelector('#nnrLocalSearch').addEventListener('click',async()=>{
      const q=dlg.querySelector('#nnrLocalQuery').value.trim();if(!q){setStatus('Введи запрос для локальной базы.');return}
      results.replaceChildren();setStatus('Ищу в сохранённых источниках…');
      try{requireBridge();const items=await window.NeuroStudio.search(q,10);
        setStatus(items.length?'Найдено фрагментов: '+items.length:'Совпадений не найдено.');
        items.forEach(it=>addResult(it.source,'Релевантность: '+Number(it.score||0).toFixed(2)+' · '+it.text.slice(0,1100),it.source,'Источник',()=>{dlg.querySelector('#nnrUrl').value=it.source;setStatus('Скопируй ссылку в поле импорта, чтобы обновить источник.')}));
      }catch(err){setStatus('Ошибка базы знаний: '+err.message)}
    });
  });
})();
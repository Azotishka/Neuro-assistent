(()=> {
  'use strict';
  const KEY='neuroNovaSnakeQ_v2', SIZE=12, ACTIONS=[0,1,2], dirs=[[0,-1],[1,0],[0,1],[-1,0]];
  let q={}, game=null, timer=null, training=false, headless=false, manualLearn=false;
  let episodes=0,best=0,totalScore=0,epsilon=.22,steps=0,trainedSteps=0,runToken=0;
  const style=document.createElement('style');
  style.textContent=`
  #nnSnakeBtn{min-height:40px;padding:0 13px;border:1px solid var(--nn-line);border-radius:13px;background:var(--nn-panel);color:var(--nn-text);font-weight:700}
  #nnSnakeDialog{width:min(900px,calc(100vw - 20px));max-height:94dvh;overflow:auto;border:1px solid var(--nn-line);border-radius:24px;background:var(--nn-bg);color:var(--nn-text);padding:0;box-shadow:0 24px 80px #0006}
  #nnSnakeDialog::backdrop{background:#070a12b8;backdrop-filter:blur(5px)}
  .nns-head{display:flex;align-items:center;justify-content:space-between;padding:17px 20px;border-bottom:1px solid var(--nn-line)}
  .nns-head h2{font-size:19px;margin:0}.nns-content{padding:16px;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(230px,.8fr);gap:16px}
  .nns-board-wrap{background:var(--nn-panel);border:1px solid var(--nn-line);border-radius:18px;padding:10px}
  #nnsCanvas{width:100%;height:auto;display:block;image-rendering:pixelated;touch-action:manipulation;border-radius:10px}
  .nns-board-wrap.nns-headless{display:none}
  .nns-controls{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.nns-btn{border:0;border-radius:12px;padding:10px 12px;background:var(--nn-accent);color:#fff;font-weight:750}.nns-btn.alt{background:var(--nn-panel-2);border:1px solid var(--nn-line);color:var(--nn-text)}.nns-btn:disabled{opacity:.5}
  .nns-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.nns-stat{background:var(--nn-panel);border:1px solid var(--nn-line);border-radius:14px;padding:11px}.nns-stat small{display:block;color:var(--nn-muted);font-size:11px}.nns-stat strong{font-size:19px}
  .nns-side{background:var(--nn-panel);border:1px solid var(--nn-line);border-radius:18px;padding:14px;min-width:0}.nns-side h3{margin:0 0 8px;font-size:14px}.nns-side p,.nns-side label{font-size:12px;line-height:1.55;color:var(--nn-muted)}.nns-side label{display:block;margin:10px 0}.nns-side input[type=range]{width:100%}.nns-side input[type=number]{width:100%;padding:9px;border:1px solid var(--nn-line);border-radius:10px;background:var(--nn-bg);color:var(--nn-text)}
  .nns-log{font:12px ui-monospace,monospace;white-space:pre-wrap;line-height:1.5;max-height:110px;overflow:auto;color:var(--nn-muted)}
  .nns-mode{display:flex;gap:8px;align-items:center;margin:10px 0;font-size:12px;color:var(--nn-muted)}.nns-mode input{accent-color:var(--nn-accent)}
  @media(max-width:620px){.nns-content{grid-template-columns:1fr;padding:10px}.nns-side{order:2}.nns-head{padding:14px}}
  `;
  document.head.append(style);
  document.addEventListener('DOMContentLoaded',()=>{
    const actions=document.querySelector('.top-actions');if(!actions||document.getElementById('nnSnakeBtn'))return;
    const btn=document.createElement('button');btn.id='nnSnakeBtn';btn.type='button';btn.textContent='🐍 Учить ИИ';
    const dlg=document.createElement('dialog');dlg.id='nnSnakeDialog';
    dlg.innerHTML=`<div class="nns-head"><div><div class="eyebrow">NEURO NOVA · REINFORCEMENT LEARNING</div><h2>Обучение ИИ: Змейка</h2></div><button class="round-btn" id="nnsClose" type="button" aria-label="Закрыть">×</button></div>
    <div class="nns-content"><div><div class="nns-board-wrap"><canvas id="nnsCanvas" width="264" height="264" aria-label="Поле игры Змейка"></canvas></div>
    <div class="nns-controls"><button class="nns-btn" id="nnsTrain">▶ Обучать</button><button class="nns-btn alt" id="nnsWatch">Наблюдать</button><button class="nns-btn alt" id="nnsPause">Пауза</button><button class="nns-btn alt" id="nnsReset">Новая игра</button></div>
    <div class="nns-controls"><button class="nns-btn alt" data-dir="0">↑</button><button class="nns-btn alt" data-dir="3">←</button><button class="nns-btn alt" data-dir="2">↓</button><button class="nns-btn alt" data-dir="1">→</button></div>
    <label class="nns-mode"><input id="nnsManualLearn" type="checkbox"> Учиться на моих ходах (ручное обучение)</label>
    <p class="nns-side p">Управляй кнопками или клавиатурой. При включённом ручном обучении ИИ получает опыт от твоих ходов.</p></div>
    <aside class="nns-side"><div class="nns-stats"><div class="nns-stat"><small>Эпизоды</small><strong id="nnsEpisodes">0</strong></div><div class="nns-stat"><small>Очки сейчас</small><strong id="nnsScore">0</strong></div><div class="nns-stat"><small>Рекорд</small><strong id="nnsBest">0</strong></div><div class="nns-stat"><small>Состояния Q</small><strong id="nnsStates">0</strong></div></div>
    <h3>Режим обучения</h3>
    <label class="nns-mode"><input id="nnsHeadless" type="checkbox"> Без визуала — максимум скорости</label>
    <label>Цель эпизодов (0 = без лимита)<input id="nnsTarget" type="number" min="0" max="10000000" step="100" value="10000"></label>
    <label>Пакет шагов за цикл: <b id="nnsBatchVal">1000</b><input id="nnsBatch" type="range" min="100" max="5000" step="100" value="1000"></label>
    <label>Скорость визуала: <b id="nnsSpeedVal">30</b> шагов/с<input id="nnsSpeed" type="range" min="5" max="160" value="30"></label>
    <label>Исследование: <b id="nnsEpsilonVal">22%</b><input id="nnsEpsilon" type="range" min="1" max="80" value="22"></label>
    <p>Q-learning: награды за еду и движение к цели, штрафы за столкновения и зацикливание. Прогресс сохраняется локально. Режим без визуала отключает отрисовку и учит пакетами, периодически отдавая управление интерфейсу.</p>
    <h3>Журнал</h3><div id="nnsLog" class="nns-log" role="status">Модель готова. Выбери режим обучения.</div><div class="nns-controls"><button class="nns-btn alt" id="nnsSave">Сохранить сейчас</button><button class="nns-btn alt" id="nnsExport">Экспорт опыта</button><button class="nns-btn alt" id="nnsClear">Сбросить знания</button></div></aside></div>`;
    document.body.append(dlg);actions.prepend(btn);
    const $=id=>dlg.querySelector('#'+id),canvas=$('nnsCanvas'),ctx=canvas.getContext('2d');
    const log=s=>{$('nnsLog').textContent=s};
    const load=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');q=x.q&&typeof x.q==='object'?x.q:{};episodes=Number(x.episodes)||0;best=Number(x.best)||0;totalScore=Number(x.totalScore)||0;trainedSteps=Number(x.trainedSteps)||0;epsilon=Number(x.epsilon)||.22}catch{q={}}};
    const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({q,episodes,best,totalScore,trainedSteps,epsilon,updatedAt:Date.now(),algorithm:'relative-action-qlearning-v2'}));return true}catch{log('Не удалось сохранить: закончилось место в хранилище. Экспортируй опыт.');return false}};
    const randFood=body=>{const free=[];for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(!body.some(p=>p.x===x&&p.y===y))free.push({x,y});return free.length?free[Math.floor(Math.random()*free.length)]:{x:0,y:0}};
    function reset(skipStats=false){const x=SIZE>>1,y=SIZE>>1;game={snake:[{x,y},{x:x-1,y},{x:x-2,y}],dir:1,food:{x:SIZE-3,y:y-2},score:0,steps:0,done:false};game.food=randFood(game.snake);if(!headless)draw();if(!skipStats)stats()}
    const turn=(dir,action)=> (dir+(action===1?1:action===2?3:0)+4)%4;
    function danger(dir){const h=game.snake[0],d=dirs[dir],x=h.x+d[0],y=h.y+d[1];return x<0||y<0||x>=SIZE||y>=SIZE||game.snake.slice(0,-1).some(p=>p.x===x&&p.y===y)}
    function state(){const h=game.snake[0],f=game.food,dir=game.dir;const left=(dir+3)%4,right=(dir+1)%4;const dx=f.x-h.x,dy=f.y-h.y;const forward=dirs[dir],relX=dx*forward[0]+dy*forward[1],relY=dx*(-forward[1])+dy*forward[0];return [danger(dir)?1:0,danger(left)?1:0,danger(right)?1:0,relX>0?1:relX<0?-1:0,relY>0?1:relY<0?-1:0].join(',')}
    function choose(){const s=state();if(!q[s])q[s]=[0,0,0];if(Math.random()<epsilon)return Math.floor(Math.random()*3);const vals=q[s],max=Math.max(...vals);const ties=vals.map((v,i)=>v===max?i:-1).filter(i=>i>=0);return ties[Math.floor(Math.random()*ties.length)]}
    function step(action,learn=true){if(game.done)return true;const oldState=state(),oldHead=game.snake[0],oldFood=game.food,dir=turn(game.dir,action),d=dirs[dir],next={x:oldHead.x+d[0],y:oldHead.y+d[1]};let reward=-.025,done=false;const ate=next.x===oldFood.x&&next.y===oldFood.y;
      const collision=next.x<0||next.y<0||next.x>=SIZE||next.y>=SIZE||game.snake.slice(0,ate?game.snake.length:game.snake.length-1).some(p=>p.x===next.x&&p.y===next.y);
      const before=Math.abs(oldHead.x-oldFood.x)+Math.abs(oldHead.y-oldFood.y);
      if(collision){reward=-10;done=true}
      else{game.dir=dir;game.snake.unshift(next);if(ate){reward=10;game.score++;game.food=randFood(game.snake);if(game.snake.length>=SIZE*SIZE)done=true}else game.snake.pop();
        const after=Math.abs(next.x-game.food.x)+Math.abs(next.y-game.food.y);if(!ate)reward+=after<before?.18:after>before?-.16:0;
        game.steps++;if(game.steps>SIZE*SIZE*4){reward-=2;done=true}
      }
      if(learn){const ns=state();if(!q[oldState])q[oldState]=[0,0,0];if(!q[ns])q[ns]=[0,0,0];const a=action;const maxNext=done?0:Math.max(...q[ns]);q[oldState][a]+=0.13*(reward+.93*maxNext-q[oldState][a]);trainedSteps++}
      if(done){game.done=true;episodes++;totalScore+=game.score;best=Math.max(best,game.score);epsilon=Math.max(.025,epsilon*.9997)}
      steps++;return done
    }
    function draw(){if(headless||!game)return;const w=canvas.width,h=canvas.height,cell=w/SIZE;ctx.fillStyle=document.documentElement.dataset.theme==='dark'?'#0d111a':'#f1f4fa';ctx.fillRect(0,0,w,h);ctx.strokeStyle=document.documentElement.dataset.theme==='dark'?'#222b3b':'#e0e6f0';for(let i=0;i<=SIZE;i++){ctx.beginPath();ctx.moveTo(i*cell,0);ctx.lineTo(i*cell,h);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i*cell);ctx.lineTo(w,i*cell);ctx.stroke()}ctx.fillStyle='#ef5261';ctx.beginPath();ctx.arc((game.food.x+.5)*cell,(game.food.y+.5)*cell,cell*.36,0,Math.PI*2);ctx.fill();game.snake.forEach((p,i)=>{ctx.fillStyle=i===0?'#5b6cff':'#43c8d8';ctx.beginPath();ctx.roundRect(p.x*cell+2,p.y*cell+2,cell-4,cell-4,5);ctx.fill()});if(game.done){ctx.fillStyle='#0b0d12b8';ctx.fillRect(0,0,w,h);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 20px sans-serif';ctx.fillText('Эпизод завершён',w/2,h/2);ctx.font='14px sans-serif';ctx.fillText('Счёт: '+game.score,w/2,h/2+24)}}
    function stats(){$('nnsEpisodes').textContent=episodes.toLocaleString('ru-RU');$('nnsScore').textContent=game?.score||0;$('nnsBest').textContent=best;$('nnsStates').textContent=Object.keys(q).length.toLocaleString('ru-RU')}
    function stop(message='Пауза. Опыт сохранён.'){training=false;runToken++;if(timer)clearTimeout(timer);timer=null;save();log(message)}
    function tickVisual(token){if(token!==runToken||!training)return;const done=step(choose(),true);if(!headless)draw();if(done){if(episodes%10===0)save();if(Number($('nnsTarget').value)>0&&episodes>=Number($('nnsTarget').value)){stop('Цель достигнута: '+episodes.toLocaleString('ru-RU')+' эпизодов. Опыт сохранён.');stats();return}reset()}stats();timer=setTimeout(()=>tickVisual(token),Math.max(2,1000/Number($('nnsSpeed').value)))}
    function tickHeadless(token){if(token!==runToken||!training)return;const batch=Math.min(5000,Math.max(100,Number($('nnsBatch').value)||1000));let ended=0;for(let i=0;i<batch&&training&&token===runToken;i++){if(step(choose(),true)){ended++;if(Number($('nnsTarget').value)>0&&episodes>=Number($('nnsTarget').value)){training=false;break}reset(true)}}stats();if(steps%10000<batch)save();if(!training){save();log('Обучение завершено: '+episodes.toLocaleString('ru-RU')+' эпизодов · '+trainedSteps.toLocaleString('ru-RU')+' шагов обучения.');return}log('Без визуала: '+episodes.toLocaleString('ru-RU')+' эпизодов · пакет '+batch+' шагов · всего '+trainedSteps.toLocaleString('ru-RU')+' обучающих шагов.');timer=setTimeout(()=>tickHeadless(token),0)}
    function start(){stop('Запуск обучения…');training=true;const token=++runToken;reset();if(headless){$('nnsBoardWrap')?.classList.add('nns-headless');dlg.querySelector('.nns-board-wrap').classList.add('nns-headless');log('Без визуала: обучение пакетами. Интерфейс будет обновляться между пакетами.');tickHeadless(token)}else{dlg.querySelector('.nns-board-wrap').classList.remove('nns-headless');log('Визуальное обучение идёт.');tickVisual(token)}}
    function watch(){stop('Режим наблюдения: обучение отключено.');headless=false;$('nnsHeadless').checked=false;dlg.querySelector('.nns-board-wrap').classList.remove('nns-headless');epsilon=0;reset();training=true;const token=++runToken;const tick=()=>{if(token!==runToken||!training)return;if(step(choose(),false)){stop('Игра завершена. Нажми «Обучать», чтобы продолжить.');draw();return}draw();stats();timer=setTimeout(tick,Math.max(2,1000/Number($('nnsSpeed').value)))};tick()}
    function manual(dir){if(training)return;const action=(dir-game.dir+4)%4;let rel=action===0?0:action===1?1:action===3?2:0;if(action===2)return;step(rel,manualLearn);if(game.done){if(manualLearn)save();reset();log(manualLearn?'Эпизод завершён; ручные ходы добавлены в обучение.':'Игра завершена. Включи ручное обучение, чтобы учить ИИ на своих ходах.')}else{if(manualLearn&&game.steps%20===0)save();draw();stats()}}
    load();reset();
    btn.addEventListener('click',()=>dlg.showModal());
    $('nnsClose').addEventListener('click',()=>{stop('Обучение приостановлено. Прогресс сохранён.');dlg.close()});
    $('nnsTrain').addEventListener('click',start);$('nnsWatch').addEventListener('click',watch);$('nnsPause').addEventListener('click',()=>stop());$('nnsReset').addEventListener('click',()=>{stop('Новая игра. Знания сохранены.');reset()});
    $('nnsHeadless').addEventListener('change',e=>{headless=e.target.checked;if(headless)dlg.querySelector('.nns-board-wrap').classList.add('nns-headless');else dlg.querySelector('.nns-board-wrap').classList.remove('nns-headless');if(training)start();else if(!headless)draw()});
    $('nnsManualLearn').addEventListener('change',e=>{manualLearn=e.target.checked;log(manualLearn?'Ручное обучение включено: ходы будут обучать Q-таблицу.':'Ручное обучение выключено.')});
    dlg.querySelectorAll('[data-dir]').forEach(b=>b.addEventListener('click',()=>manual(Number(b.dataset.dir))));
    window.addEventListener('keydown',e=>{if(!dlg.open||['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;const map={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3};if(map[e.key]!==undefined){e.preventDefault();manual(map[e.key])}});
    $('nnsSpeed').addEventListener('input',()=>{$('nnsSpeedVal').textContent=$('nnsSpeed').value});
    $('nnsBatch').addEventListener('input',()=>{$('nnsBatchVal').textContent=$('nnsBatch').value});
    $('nnsEpsilon').addEventListener('input',()=>{$('nnsEpsilonVal').textContent=$('nnsEpsilon').value+'%';epsilon=Number($('nnsEpsilon').value)/100});
    $('nnsSave').addEventListener('click',()=>log(save()?'Опыт сохранён на устройстве.':'Не удалось сохранить. Экспортируй опыт.'));
    $('nnsExport').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({q,episodes,best,totalScore,trainedSteps,epsilon,algorithm:'relative-action-qlearning-v2'},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='neuro-snake-training.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);log('Экспорт опыта подготовлен.')});
    $('nnsClear').addEventListener('click',()=>{stop('Сброс знаний…');if(confirm('Удалить все знания ИИ «Змейки»?')){q={};episodes=0;best=0;totalScore=0;trainedSteps=0;epsilon=.22;save();reset();log('Знания сброшены. Можно обучать заново.')}});
    window.addEventListener('beforeunload',save);
  });
})();
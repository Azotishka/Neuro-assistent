(()=> {
  const KEY='neuroNovaSnakeQ_v1';
  const SIZE=12, CELL=22, ACTIONS=[0,1,2,3];
  const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
  let q={}, game=null, timer=null, episodes=0, totalScore=0, best=0, epsilon=.22, training=false, stepCount=0;
  const style=document.createElement('style');
  style.textContent=`
  #nnSnakeBtn{min-height:40px;padding:0 13px;border:1px solid var(--nn-line);border-radius:13px;background:var(--nn-panel);color:var(--nn-text);font-weight:700}
  #nnSnakeDialog{width:min(820px,calc(100vw - 20px));max-height:94dvh;overflow:auto;border:1px solid var(--nn-line);border-radius:24px;background:var(--nn-bg);color:var(--nn-text);padding:0;box-shadow:0 24px 80px #0006}
  #nnSnakeDialog::backdrop{background:#070a12b8;backdrop-filter:blur(5px)}
  .nns-head{display:flex;align-items:center;justify-content:space-between;padding:17px 20px;border-bottom:1px solid var(--nn-line)}
  .nns-head h2{font-size:19px;margin:0}.nns-content{padding:16px;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(220px,.8fr);gap:16px}
  .nns-board-wrap{background:var(--nn-panel);border:1px solid var(--nn-line);border-radius:18px;padding:10px}
  #nnsCanvas{width:100%;height:auto;display:block;image-rendering:pixelated;touch-action:manipulation;border-radius:10px}
  .nns-controls{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.nns-btn{border:0;border-radius:12px;padding:10px 12px;background:var(--nn-accent);color:#fff;font-weight:750}.nns-btn.alt{background:var(--nn-panel-2);border:1px solid var(--nn-line);color:var(--nn-text)}
  .nns-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.nns-stat{background:var(--nn-panel);border:1px solid var(--nn-line);border-radius:14px;padding:11px}.nns-stat small{display:block;color:var(--nn-muted);font-size:11px}.nns-stat strong{font-size:19px}
  .nns-side{background:var(--nn-panel);border:1px solid var(--nn-line);border-radius:18px;padding:14px;min-width:0}.nns-side h3{margin:0 0 8px;font-size:14px}.nns-side p,.nns-side label{font-size:12px;line-height:1.55;color:var(--nn-muted)}
  .nns-side input[type=range]{width:100%}.nns-log{font:12px ui-monospace,monospace;white-space:pre-wrap;line-height:1.5;max-height:110px;overflow:auto;color:var(--nn-muted)}
  @media(max-width:620px){.nns-content{grid-template-columns:1fr;padding:10px}.nns-side{order:2}.nns-head{padding:14px}}
  `;
  document.head.append(style);
  document.addEventListener('DOMContentLoaded',()=>{
    const actions=document.querySelector('.top-actions');if(!actions||document.getElementById('nnSnakeBtn'))return;
    const btn=document.createElement('button');btn.id='nnSnakeBtn';btn.type='button';btn.textContent='🐍 Учить ИИ';
    const dlg=document.createElement('dialog');dlg.id='nnSnakeDialog';
    dlg.innerHTML=`<div class="nns-head"><div><div class="eyebrow">NEURO NOVA · REINFORCEMENT LEARNING</div><h2>Обучение ИИ: Змейка</h2></div><button class="round-btn" id="nnsClose" type="button" aria-label="Закрыть">×</button></div>
    <div class="nns-content"><div><div class="nns-board-wrap"><canvas id="nnsCanvas" width="264" height="264" aria-label="Поле игры Змейка"></canvas></div><div class="nns-controls"><button class="nns-btn" id="nnsTrain">▶ Учить</button><button class="nns-btn alt" id="nnsWatch">Наблюдать</button><button class="nns-btn alt" id="nnsPause">Пауза</button><button class="nns-btn alt" id="nnsReset">Новая игра</button></div><div class="nns-controls"><button class="nns-btn alt" data-dir="0">↑</button><button class="nns-btn alt" data-dir="3">←</button><button class="nns-btn alt" data-dir="2">↓</button><button class="nns-btn alt" data-dir="1">→</button></div></div>
    <aside class="nns-side"><div class="nns-stats"><div class="nns-stat"><small>Эпизоды</small><strong id="nnsEpisodes">0</strong></div><div class="nns-stat"><small>Очки сейчас</small><strong id="nnsScore">0</strong></div><div class="nns-stat"><small>Рекорд</small><strong id="nnsBest">0</strong></div><div class="nns-stat"><small>Состояния Q</small><strong id="nnsStates">0</strong></div></div>
    <h3>Параметры обучения</h3><label>Скорость: <b id="nnsSpeedVal">30</b> шагов/с<input id="nnsSpeed" type="range" min="5" max="160" value="30"></label>
    <label>Исследование: <b id="nnsEpsilonVal">22%</b><input id="nnsEpsilon" type="range" min="1" max="80" value="22"></label>
    <p>ИИ обучается методом Q-learning: пробует действия, получает награду за еду и штраф за столкновение. Таблица опыта автоматически сохраняется на устройстве.</p><h3>Журнал</h3><div id="nnsLog" class="nns-log">Модель готова. Нажми «Учить».</div><button class="nns-btn alt" id="nnsClear" type="button">Сбросить знания ИИ</button></aside></div>`;
    document.body.append(dlg);actions.prepend(btn);
    const $=id=>dlg.querySelector('#'+id), canvas=$('nnsCanvas'),ctx=canvas.getContext('2d');
    const load=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');q=x.q||{};episodes=x.episodes||0;best=x.best||0;totalScore=x.totalScore||0;}catch{q={}}};
    const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({q,episodes,best,totalScore,epsilon,updatedAt:Date.now()}))}catch{log('Не удалось сохранить таблицу: недостаточно места в хранилище.')}};
    const log=s=>{$('nnsLog').textContent=s};
    const randFood=body=>{let p;do{p={x:Math.floor(Math.random()*SIZE),y:Math.floor(Math.random()*SIZE)}}while(body.some(a=>a.x===p.x&&a.y===p.y));return p};
    function reset(){const x=Math.floor(SIZE/2),y=Math.floor(SIZE/2);game={snake:[{x,y},{x:x-1,y},{x:x-2,y}],dir:1,food:{x:SIZE-3,y:Math.floor(SIZE/2)},score:0,steps:0,done:false};game.food=randFood(game.snake);draw();stats()}
    function danger(dir){const h=game.snake[0],d=dirs[dir],x=h.x+d[0],y=h.y+d[1];return x<0||y<0||x>=SIZE||y>=SIZE||game.snake.slice(0,-1).some(p=>p.x===x&&p.y===y)}
    function state(){const h=game.snake[0],food=game.food;const dx=food.x-h.x,dy=food.y-h.y;return [danger(game.dir),danger((game.dir+3)%4),danger((game.dir+1)%4),Math.sign(dx),Math.sign(dy),game.dir].join(',')}
    function act(){const s=state();if(!q[s])q[s]=[0,0,0,0];if(Math.random()<epsilon)return Math.floor(Math.random()*4);return q[s].indexOf(Math.max(...q[s]))}
    function move(dir,learn=true){if(game.done)return; if((dir+2)%4===game.dir&&game.snake.length>1)dir=game.dir;game.dir=dir;const old=state(),a=dir,h=game.snake[0],d=dirs[dir],next={x:h.x+d[0],y:h.y+d[1]};let reward=-.02,done=false,ate=next.x===game.food.x&&next.y===game.food.y;
      if(next.x<0||next.y<0||next.x>=SIZE||next.y>=SIZE||game.snake.slice(0,ate?game.snake.length:game.snake.length-1).some(p=>p.x===next.x&&p.y===next.y)){reward=-10;done=true}
      else{const before=Math.abs(h.x-game.food.x)+Math.abs(h.y-game.food.y);game.snake.unshift(next);if(ate){reward=10;game.score++;game.food=randFood(game.snake)}else game.snake.pop();const after=Math.abs(next.x-game.food.x)+Math.abs(next.y-game.food.y);if(!ate&&after<before)reward+=.12;else if(!ate&&after>before)reward-=.12;game.steps++;if(game.steps>SIZE*SIZE*3)done=true}
      if(learn){const s=old;if(!q[s])q[s]=[0,0,0,0];const nextState=state();if(!q[nextState])q[nextState]=[0,0,0,0];const maxNext=done?0:Math.max(...q[nextState]);q[s][a]+=0.12*(reward+0.92*maxNext-q[s][a])}
      if(done){game.done=true;episodes++;totalScore+=game.score;best=Math.max(best,game.score);if(episodes%10===0)save();if(training&&episodes%5===0)log('Эпизод '+episodes+' · средний счёт: '+(totalScore/episodes).toFixed(2)+' · состояний: '+Object.keys(q).length)}
      draw();stats();
    }
    function draw(){const w=canvas.width,h=canvas.height,cell=w/SIZE;ctx.fillStyle=document.documentElement.dataset.theme==='dark'?'#0d111a':'#f1f4fa';ctx.fillRect(0,0,w,h);ctx.strokeStyle=document.documentElement.dataset.theme==='dark'?'#222b3b':'#e0e6f0';for(let i=0;i<=SIZE;i++){ctx.beginPath();ctx.moveTo(i*cell,0);ctx.lineTo(i*cell,h);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i*cell);ctx.lineTo(w,i*cell);ctx.stroke()}ctx.fillStyle='#ef5261';ctx.beginPath();ctx.arc((game.food.x+.5)*cell,(game.food.y+.5)*cell,cell*.36,0,Math.PI*2);ctx.fill();game.snake.forEach((p,i)=>{ctx.fillStyle=i===0?'#5b6cff':'#43c8d8';ctx.beginPath();ctx.roundRect(p.x*cell+2,p.y*cell+2,cell-4,cell-4,5);ctx.fill()});if(game.done){ctx.fillStyle='#0b0d12b8';ctx.fillRect(0,0,w,h);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 20px sans-serif';ctx.fillText('Эпизод завершён',w/2,h/2);ctx.font='14px sans-serif';ctx.fillText('Счёт: '+game.score,w/2,h/2+24)}}
    function stats(){$('nnsEpisodes').textContent=episodes;$('nnsScore').textContent=game?.score||0;$('nnsBest').textContent=best;$('nnsStates').textContent=Object.keys(q).length}
    function stop(){if(timer)clearInterval(timer);timer=null;training=false}
    function start(train){stop();training=train;let delay=1000/Number($('nnsSpeed').value);timer=setInterval(()=>{if(game.done){if(training){reset();stepCount++;if(stepCount%100===0)save()}else{stop();log('Эпизод завершён. Нажми «Учить», чтобы продолжить.');return}}const a=act();move(a,training);if(!training&&game.done)stop()},delay);log(train?'Обучение идёт. Q-learning обновляет таблицу после каждого шага.':'ИИ играет по накопленным знаниям.')}
    load();reset();btn.addEventListener('click',()=>dlg.showModal());$('nnsClose').addEventListener('click',()=>{stop();dlg.close();save()});
    $('nnsTrain').addEventListener('click',()=>start(true));$('nnsWatch').addEventListener('click',()=>{epsilon=0;start(false)});$('nnsPause').addEventListener('click',()=>{stop();save();log('Пауза. Опыт сохранён на устройстве.')});
    $('nnsReset').addEventListener('click',()=>{stop();reset();log('Новая игра. Накопленные знания сохранены.')});
    dlg.querySelectorAll('[data-dir]').forEach(b=>b.addEventListener('click',()=>{if(!timer)move(Number(b.dataset.dir),false)}));
    $('nnsSpeed').addEventListener('input',()=>{$('nnsSpeedVal').textContent=$('nnsSpeed').value;if(timer)start(training)});
    $('nnsEpsilon').addEventListener('input',()=>{$('nnsEpsilonVal').textContent=$('nnsEpsilon').value+'%';epsilon=Number($('nnsEpsilon').value)/100});
    $('nnsClear').addEventListener('click',()=>{stop();if(confirm('Удалить все накопленные знания змейки?')){q={};episodes=0;best=0;totalScore=0;save();reset();log('Знания сброшены. ИИ начнёт учиться заново.')}});
    window.addEventListener('beforeunload',save);
  });
})();
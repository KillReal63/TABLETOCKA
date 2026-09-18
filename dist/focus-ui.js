let activeView='today';
const previousRender=render;
function setView(view){if(!['today','meds','history','settings'].includes(view))return;activeView=view;document.querySelectorAll('[data-panel]').forEach(el=>el.hidden=el.dataset.panel!==view);document.querySelectorAll('[data-view]').forEach(el=>{el.classList.toggle('active',el.dataset.view===view);if(el.dataset.view===view)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')});window.scrollTo({top:0,behavior:'instant'})}
render=function(){
 previousRender();
 const list=entries(today()),remaining=list.filter(x=>!state.taken[x.key]),focus=remaining[0],next=remaining[1];
 const minute=new Date().toTimeString().slice(0,5);
 $('#focus-label').textContent=focus?(focus.time<minute?'Не отмечено':focus.time===minute?'Время приёма':'Ближайший приём'):'Сегодня';
 $('#focus-hero').innerHTML=focus?`<section class="md-focus-main"><div class="md-focus-time">${esc(focus.time)}</div><div class="md-focus-object"><span class="md-pill gold" aria-hidden="true"></span></div><h2>${esc(focus.med.name)}</h2><p>${details(focus.med)}</p></section><button class="md-primary" data-take="${esc(focus.key)}">✓ ${focus.med.category==='action'?'Я выполнил':focus.med.category==='ointment'?'Я нанёс':'Я принял'}</button><div class="md-focus-secondary"><button class="md-text-button" data-edit="${esc(focus.med.id)}">Подробнее</button><button class="md-text-button" data-view="history">Всё расписание</button></div>`:`<section class="md-focus-main"><div class="md-focus-time">${list.length?'✓':'—'}</div><div class="md-focus-object"><span class="md-pill gold" aria-hidden="true"></span></div><h2>${list.length?'Всё на сегодня':state.meds.length?'Сегодня без приёмов':'Пока нет приёмов'}</h2><p>${list.length?'Все приёмы отмечены.':state.meds.length?'По твоему расписанию сегодня нет приёмов.':'Добавь препарат и время из своего назначения.'}</p></section><button class="md-primary" ${state.meds.length?'data-view="history"':'data-add'}>${state.meds.length?'Посмотреть расписание':'＋ Добавить запись'}</button>`;
 $('#following').innerHTML=next?`<button class="md-focus-next" data-view="history"><div><small>Следом</small><strong>${esc(next.med.name)} · ${esc(next.med.dose)}</strong></div><div><small>По расписанию</small>${esc(next.time)}</div></button>`:'';
 const completed=list.filter(x=>state.taken[x.key]).sort((a,b)=>state.taken[b.key].localeCompare(state.taken[a.key]));
 $('#recently-taken').textContent=completed.length?`✓ ${completed[0].med.name} — отмечено в ${new Date(state.taken[completed[0].key]).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})}`:'';
 $('#focus-progress').innerHTML=list.map(x=>`<span class="${state.taken[x.key]?'complete':''}"></span>`).join('');
 $('#summary').textContent=list.length?`Отмечено ${completed.length} из ${list.length}`:state.meds.length?'На сегодня приёмов нет':'Расписание появится здесь';
 const history=Object.entries(state.taken).sort((a,b)=>b[1].localeCompare(a[1])).slice(0,100);
 $('#history-list').innerHTML=history.length?history.map(([key,stamp])=>{const [date,id,clock]=key.split('|');const med=state.meds.find(m=>m.id===id);return `<article class="dose done"><div class="dose-info"><h3>${esc(med?.name||'Удалённый препарат')}</h3><p>По расписанию: ${esc(date)} · ${esc(clock)}</p><p>Отмечено: ${esc(new Date(stamp).toLocaleString('ru',{dateStyle:'short',timeStyle:'short'}))}</p></div><button class="compact-action" data-take="${esc(key)}" aria-label="Отменить отметку ${esc(med?.name||'препарата')}">Отменить</button></article>`}).join(''):'<p class="small">Здесь появятся твои отметки о приёме.</p>';
};
document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.view)setView(button.dataset.view);if(button.hasAttribute('data-add')&&authenticated)openEditor()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&authenticated)render()});
setInterval(()=>{if(authenticated&&!busy&&!document.hidden)render()},30000);
render();setView('today');

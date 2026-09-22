const $ = s => document.querySelector(s);
const KEY='vovremya-v1';
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
let state={meds:[],taken:{},notified:{}},version=0,authenticated=false,busy=false,lastSaved={meds:[],taken:{}};
let editing=null,toastTimer;
const categories={pill:'Таблетка',ointment:'Мазь',supplement:'БАД',action:'Действие'};
const categoryLabel=m=>categories[m.category||'pill'];
const categoryShapes={
 pill:'<circle cx="32" cy="32" r="21"/><path d="M17 47 47 17"/>',
 ointment:'<path d="m19 10 26 0-4 36H23Z"/><path d="M19 16h26M24 46h16v9H24Z"/><path d="M27 30h10M32 25v10"/>',
 supplement:'<rect x="24" y="6" width="16" height="9" rx="2"/><rect x="18" y="15" width="28" height="42" rx="9"/><path d="M19 26h26M19 47h26M27 40c0-7 5-10 11-10 0 7-4 11-11 10ZM27 40l7-6"/>',
 action:'<rect x="14" y="10" width="36" height="46" rx="7"/><path d="M25 10V7h14v3M23 32l6 6 13-14M24 46h16"/>'
};
function categoryIcon(m){
 const category=m?.category||'pill';
 if(category==='pill')return '<span class="category-art art-pill" aria-hidden="true"><span class="md-pill gold"></span></span>';
 if(category==='ointment')return '<span class="category-art art-ointment" aria-hidden="true"><span class="ointment-tube"><span class="tube-band">+</span></span><span class="tube-cap"></span></span>';
 if(category==='action')return '<span class="category-art art-action" aria-hidden="true"><span class="action-sheet"><svg viewBox="0 0 40 40" fill="none"><path d="m10 20 7 7 14-15" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="sheet-line"></span></span></span>';
 return `<svg class="category-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${categoryShapes.supplement}</svg>`;
}
const completedLabel=m=>m.category==='action'?'Выполнено':m.category==='ointment'?'Нанесено':'Принято';
const mealLabels={before:'До еды',after:'После еды',any:'Неважно',fasting:'Натощак'};
const details=m=>[categoryLabel(m),m.category!=='ointment'&&m.dose,m.category!=='ointment'&&m.meal&&mealLabels[m.meal],m.note].filter(Boolean).map(esc).join(' · ');
const weekdays=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,7000)}
async function api(path,body){const r=await fetch('/vovrema/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,cache:'no-store'});let data;try{data=await r.json()}catch{throw Error('Сервер недоступен. Попробуй позже.')}if(!r.ok){const e=Error(data.error||'Ошибка сервера');e.status=r.status;throw e}return data}
async function load(force=false){const data=await api('state');if((busy&&!force)||data.version<version)return;version=data.version;lastSaved=structuredClone(data.state);state={...data.state,notified:state.notified};render()}
async function save(){if(busy||!authenticated)return false;busy=true;try{const snapshot={meds:state.meds,taken:state.taken};const result=await api('state',{state:snapshot,version});version=result.version;lastSaved=structuredClone(snapshot);return true}catch(e){state={...structuredClone(lastSaved),notified:state.notified};if(e.status===409){try{await load(true)}catch{}}if(e.status===401)lock();toast(e.message||'Не удалось сохранить. Проверь подключение.');return false}finally{busy=false;render()}}
function entries(date){return state.meds.filter(m=>scheduledOn(m,date)).flatMap(m=>m.times.map(time=>({med:m,time,key:`${date}|${m.id}|${time}`}))).sort((a,b)=>a.time.localeCompare(b.time))}
function render(){const date=$('#day').value||today(),items=entries(date),todays=entries(today()),done=todays.filter(x=>state.taken[x.key]).length;
 $('#date').textContent=new Intl.DateTimeFormat('ru',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
 $('#progress').textContent=todays.length?`${done} из ${todays.length} приёмов отмечено`:'Пока нет приёмов';$('#bar').max=todays.length||1;$('#bar').value=done;
 const now=new Date().toTimeString().slice(0,5),next=todays.find(x=>!state.taken[x.key]&&x.time>=now);
 $('#next').textContent=next?`${next.time} · ${next.med.name}`:todays.some(x=>!state.taken[x.key])?'Есть неотмеченные приёмы':todays.length?'Всё на сегодня отмечено':'Добавь своё первое лекарство';
 $('#schedule').innerHTML=items.length?items.map(x=>{const taken=state.taken[x.key],past=date<today()||(date===today()&&x.time<now);return `<article class="dose ${taken?'done':''}"><div class="time">${x.time}</div><div class="dose-info"><h3>${categoryIcon(x.med)}${esc(x.med.name)}</h3><p>${details(x.med)}</p><p class="status">${taken?'✓ '+completedLabel(x.med):past?'Время прошло · не отмечено':'По расписанию'}</p></div>${date<=today()?`<button class="${taken?'secondary':''}" data-take="${esc(x.key)}" aria-label="${taken?'Отменить отметку':'Отметить приём'} ${esc(x.med.name)} в ${x.time}">${taken?'Отменить':completedLabel(x.med)}</button>`:''}</article>`}).join(''):`<div class="empty"><h3>${state.meds.length?'Свободный день':'Начнём с первого лекарства'}</h3><p>${state.meds.length?'На эту дату приёмов нет.':'Добавь название, дозировку и время — здесь появится твоё расписание.'}</p></div>`;
 $('#count').textContent=String(state.meds.length);$('#meds').innerHTML=state.meds.length?state.meds.map(m=>`<article class="med"><div class="med-body">${categoryIcon(m)}<div class="med-info"><strong>${esc(m.name)}</strong><p><b>${esc(categoryLabel(m))}</b>${m.category!=='ointment'&&m.dose?' · '+esc(m.dose):''} · <b>${m.times.join(', ')}</b> · ${m.durationDays?`${m.durationDays} дн.`:m.cycle?`${m.cycle.on} дн. приёма / ${m.cycle.off} дн. перерыва`:m.days.length===7?'Ежедневно':m.days.map(d=>weekdays[d]).join(', ')}</p><p>С ${esc(m.start)}${m.end?' до '+esc(m.end):' · без даты окончания'}${m.category!=='ointment'&&m.meal?' · '+mealLabels[m.meal]:''}</p></div></div><div class="med-actions"><button class="icon" data-edit="${m.id}" aria-label="Изменить ${esc(m.name)}">Изменить</button><button class="icon danger" data-delete="${m.id}" aria-label="Удалить ${esc(m.name)}">Удалить</button></div></article>`).join(''):'<p class="small">Здесь будут сохранённые лекарства.</p>';
}
function openEditor(id){
 editing=id||null;const m=state.meds.find(x=>x.id===id),f=$('#form');f.reset();$('#form-error').textContent='';$('#form-title').textContent=m?'Изменить запись':'Новая запись';
 for(const key of ['name','end'])f.elements[key].value=m?.[key]||'';
 const choices=['1/4','1/2','1','2','3'],dose=m?m.dose:'1';
 if(!choices.includes(dose))choices.push(dose);
 $('#dose-options').innerHTML=choices.map(value=>`<label><input type="radio" name="dose" value="${esc(value)}" ${value===dose?'checked':''}>${esc(value||'Без дозировки')}</label>`).join('');
 f.elements.meal.value=m?.meal||'any';f.elements.start.value=m?.start||today();f.elements.times.value=m?.times.join(', ')||'09:00';
 $('#week').innerHTML=[1,2,3,4,5,6,0].map(d=>`<label><input type="checkbox" value="${d}" ${(m?m.days.includes(d):true)?'checked':''}>${weekdays[d]}</label>`).join('');
 f.elements.scheduleMode.value=m?.durationDays?'duration':m?.cycle?'cycle':m&&!m.end&&m.days.length===7?'daily':'weekly';f.elements.durationDays.value=m?.durationDays||7;f.elements.cycleOn.value=m?.cycle?.on||1;f.elements.cycleOff.value=m?.cycle?.off||1;f.elements.category.value=m?.category||'pill';updateCategory();updateScheduleMode();$('#editor').showModal();
}
function updateCategory(){const f=$('#form'),ointment=f.elements.category.value==='ointment';f.elements.name.placeholder=f.elements.category.value==='action'?'Например, измерить давление':'Название из назначения';for(const id of ['dose-fields','meal-fields']){$('#'+id).hidden=ointment;$('#'+id).disabled=ointment}}
$('#form').elements.category.onchange=updateCategory;

// Multiple 24-hour times: 09001430 -> 09:00, 14:30.
const timeInput=$('#form').elements.times;
timeInput.addEventListener('beforeinput',event=>{
 if(timeInput.selectionStart!==timeInput.selectionEnd)return;
 const position=timeInput.selectionStart,value=timeInput.value;
 if(event.inputType==='deleteContentBackward'&&position>0&&/[^0-9]/.test(value[position-1])){
  let start=position-1;while(start>0&&/[^0-9]/.test(value[start]))start--;
  timeInput.setSelectionRange(start,position);
 }else if(event.inputType==='deleteContentForward'&&position<value.length&&/[^0-9]/.test(value[position])){
  let end=position;while(end<value.length&&/[^0-9]/.test(value[end]))end++;
  timeInput.setSelectionRange(position,Math.min(end+1,value.length));
 }
});
timeInput.addEventListener('input',()=>{
 const before=timeInput.value.slice(0,timeInput.selectionStart).replace(/\D/g,'').length;
 const digits=timeInput.value.replace(/\D/g,'').slice(0,192);
 const groups=digits.match(/.{1,4}/g)||[];
 timeInput.value=groups.map(group=>group.length>=2?group.slice(0,2)+':'+group.slice(2):group).join(', ');
 let caret=0,count=0;
 while(caret<timeInput.value.length&&count<before){if(/\d/.test(timeInput.value[caret]))count++;caret++}
 while(caret<timeInput.value.length&&/[^0-9]/.test(timeInput.value[caret]))caret++;
 timeInput.setSelectionRange(caret,caret);
});

function updateScheduleMode(){
 const mode=$('#form').elements.scheduleMode.value;
 for(const [id,value] of [['cycle-fields','cycle'],['weekly-fields','weekly'],['duration-fields','duration']]){$('#'+id).hidden=mode!==value;$('#'+id).disabled=mode!==value}
 const hideEnd=mode==='duration'||mode==='daily';$('#end-field').hidden=hideEnd;$('#form').elements.end.disabled=hideEnd;$('#start-label').textContent=mode==='cycle'?'Первый день приёма':mode==='daily'?'Начало приёма':'Начало курса';updateScheduleHint();
}
$('#form').elements.scheduleMode.onchange=updateScheduleMode;

function updateScheduleHint(){
 const f=$('#form'),mode=f.elements.scheduleMode.value,hint=$('#schedule-hint');
 let text='';
 if(mode==='duration'){
  text='Дата начала считается первым днём курса.';
  const days=Number(f.elements.durationDays.value),start=f.elements.start.value;
  if(start&&f.elements.start.validity.valid&&Number.isInteger(days)&&days>=1&&days<=3650){
   const end=courseEnd(start,days);
   text+=' Последний день — '+new Intl.DateTimeFormat('ru',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(end+'T00:00:00Z'))+'.';
  }
 }else if(mode==='cycle'){
  const on=Number(f.elements.cycleOn.value),off=Number(f.elements.cycleOff.value);
  text='Дни приёма + дни перерыва = полный цикл.';
  if([on,off].every(n=>Number.isInteger(n)&&n>=1&&n<=365))text=`Цикл: ${on} дн. приёма + ${off} дн. перерыва = ${on+off} дн. Затем повторяется.`;
 }else if(mode==='daily')text='Ежедневно в указанное время, без даты окончания.';
 hint.textContent=text;hint.hidden=!text;
}
for(const name of ['durationDays','cycleOn','cycleOff','start'])$('#form').elements[name].addEventListener('input',updateScheduleHint);

$('#add').onclick=()=>openEditor();$('#close').onclick=()=>$('#editor').close();$('#day').value=today();$('#day').onchange=render;
$('#form').onsubmit=async e=>{e.preventDefault();if(busy||!authenticated)return;const f=e.target,isCycle=f.elements.scheduleMode.value==='cycle',days=f.elements.scheduleMode.value!=='weekly'?[0,1,2,3,4,5,6]:[...$('#week').querySelectorAll('input:checked')].map(x=>Number(x.value));const name=f.elements.name.value.trim(),dose=f.elements.category.value==='ointment'?'':f.elements.dose.value.trim(),start=f.elements.start.value;let end=f.elements.scheduleMode.value==='daily'?'':f.elements.end.value;const durationDays=Number(f.elements.durationDays.value);if(f.elements.scheduleMode.value==='duration'){if(!Number.isInteger(durationDays)||durationDays<1||durationDays>3650){$('#form-error').textContent='Укажи от 1 до 3650 дней.';return}end=courseEnd(start,durationDays)}if(!name||(!dose&&!['action','ointment'].includes(f.elements.category.value))||!days.length||(end&&end<start)){$('#form-error').textContent='Укажи название, дозировку, хотя бы один день и корректные даты курса.';return}const med={id:editing||crypto.randomUUID(),name,dose,category:f.elements.category.value,start,end,days,times:[...new Set(f.elements.times.value.split(',').map(x=>x.trim()))].sort(),...(f.elements.category.value==='ointment'?{}:{meal:f.elements.meal.value}),note:state.meds.find(m=>m.id===editing)?.note||''};if(f.elements.scheduleMode.value==='duration')med.durationDays=durationDays;if(isCycle){const on=Number(f.elements.cycleOn.value),off=Number(f.elements.cycleOff.value);if(![on,off].every(n=>Number.isInteger(n)&&n>=1&&n<=365)){$('#form-error').textContent='Укажи дни приёма и перерыва: целые числа от 1 до 365.';return}med.cycle={on,off}}if(editing)state.meds=state.meds.map(m=>m.id===editing?med:m);else state.meds.push(med);const saved=await save();if(saved){$('#editor').close();toast('Сохранено на сервере')}};
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||busy||!authenticated)return;if(b.dataset.take){const key=b.dataset.take;if(state.taken[key])delete state.taken[key];else state.taken[key]=new Date().toISOString();await save();render()}if(b.dataset.edit)openEditor(b.dataset.edit);if(b.dataset.delete&&confirm('Удалить лекарство из расписания?')){state.meds=state.meds.filter(m=>m.id!==b.dataset.delete);await save();render()}});
$('#notifications').onclick=async()=>{if(!('Notification'in window)){toast('Этот браузер не поддерживает уведомления. Напоминания на странице доступны.');return}try{const result=await Notification.requestPermission();$('#notification-status').textContent=result==='granted'?'Уведомления включены для открытой страницы. В фоне возможны задержки; после закрытия сайта они не приходят.':'Уведомления не разрешены. Можно включить их в настройках браузера; напоминания на странице работают.'}catch{toast('Уведомления недоступны. Напоминания на странице продолжают работать.')}};
function tick(){if(!authenticated||window.pushEnabled)return;render();const now=new Date(),minute=now.toTimeString().slice(0,5);for(const x of entries(today())){if(x.time!==minute||state.taken[x.key]||state.notified[x.key])continue;state.notified[x.key]=true;toast(`Время приёма: ${x.med.name} · ${x.med.dose}`);if('Notification'in window&&Notification.permission==='granted'){try{new Notification('Время приёма',{body:`${x.med.name} · ${x.med.dose}`,tag:x.key})}catch{}}}}
$('#zone').textContent=Intl.DateTimeFormat().resolvedOptions().timeZone;render();setInterval(tick,15000);
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'read_medication_schedule',description:'Read medication schedule for a local calendar date.',inputSchema:{type:'object',properties:{date:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$'}},required:['date'],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:({date})=>{if(!authenticated)throw Error('Login required');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(new Date(date+'T12:00:00').valueOf()))throw Error('Invalid date');return entries(date).map(x=>({name:x.med.name,dose:x.med.dose,time:x.time,taken:!!state.taken[x.key]}))}})).catch(()=>{})}catch{}}

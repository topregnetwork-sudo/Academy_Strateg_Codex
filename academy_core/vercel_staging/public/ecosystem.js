const STORE = "academy-ecosystem-demo-v1";
const events = [
  {
    id: "chelyabinsk-7-tools-2026-09-23",
    city: "Челябинск",
    format: "offline",
    title: "7 инструментов системного бизнеса",
    date: "23 сентября 2026",
    time: "Время уточняется",
    venue: "Парк Сити · ул. Лесопарковая, 6",
    speaker: "Наталья Корсакова",
    price: "1 500 ₽",
    status: "Регистрация открыта · источник проверен",
    tone: "gold",
  },
  {
    id: "izhevsk-announcement-pending",
    city: "Ижевск",
    format: "offline",
    title: "Анонс ожидается из VK",
    date: "Дата не получена",
    time: "Не выдумываем",
    venue: "Площадка уточняется",
    speaker: "Организатор уточняется",
    price: "Уточняется",
    status: "Ожидает подтверждённый анонс",
    tone: "muted",
    pending: true,
  },
  {
    id: "online-system-business-demo",
    city: "Все города",
    format: "online",
    title: "Системный бизнес: вводная онлайн-встреча",
    date: "Синтетическое событие",
    time: "Тестовый слот",
    venue: "Online",
    speaker: "Демонстрационный спикер",
    price: "Бесплатно",
    status: "Только для проверки механики",
    tone: "",
    synthetic: true,
  },
];
const defaultState = () => ({
  channels: { Telegram: true, VK: true, "WhatsApp Status": false, "Instagram Story": false, LinkedIn: false },
  selectedEvent: events[0].id,
  creative: null,
  ownerRegistered: false,
  ownerTested: false,
  materialOpened: false,
  externalOpened: false,
  ledger: [{ type: "batman.link_requested", detail: "Batman самостоятельно запросил ссылку — btm_id DEMO-7K4M активирован", at: new Date().toISOString() }],
});
let state = load();
function load(){try{return {...defaultState(),...JSON.parse(localStorage.getItem(STORE)||"{}")}}catch{return defaultState()}}
function save(){localStorage.setItem(STORE,JSON.stringify(state));renderAll()}
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const eventById = (id) => events.find((e)=>e.id===id)||events[0];
function addEvent(type,detail){state.ledger.unshift({type,detail,at:new Date().toISOString()});save()}
function toast(text){const t=$("#toast");t.textContent=text;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function showView(name){$$('.view').forEach((v)=>v.classList.toggle('active',v.id===`view-${name}`));$$('.tab').forEach((b)=>b.classList.toggle('active',b.dataset.view===name));window.scrollTo({top:0,behavior:'smooth'})}
function renderEvents(filter="all"){
  const visible=events.filter((e)=>filter==='all'||e.format===filter||e.city===filter);
  $("#event-grid").innerHTML=visible.map((e)=>`<article class="event-card" data-event="${e.id}"><div class="event-banner ${e.tone}"><span class="pill">${e.format==='online'?'ONLINE':e.city.toUpperCase()}</span><strong>${e.title}</strong><small>${e.status}</small></div><div class="event-body"><h3>${e.date}</h3><div class="event-facts"><span class="pill">${e.time}</span><span class="pill">${e.venue}</span><span class="pill">${e.price}</span></div><p>Спикер: ${e.speaker}</p><div class="event-actions"><button class="primary choose-event" ${e.pending?'disabled':''}>${e.pending?'Ждём анонс':'Выбрать'}</button><button class="soft share-event" ${e.pending?'disabled':''}>Подготовить публикацию</button></div></div></article>`).join('');
  $$('.choose-event').forEach((b)=>b.onclick=()=>{state.selectedEvent=b.closest('[data-event]').dataset.event;addEvent('event.selected',`Batman выбрал: ${eventById(state.selectedEvent).title}`);showView('owner')});
  $$('.share-event').forEach((b)=>b.onclick=()=>{state.selectedEvent=b.closest('[data-event]').dataset.event;save();showView('batman');$('#studio-event').value=state.selectedEvent;$('#generate').focus()});
}
function renderStudio(){
  $('#studio-event').innerHTML=events.map((e)=>`<option value="${e.id}" ${e.pending?'disabled':''}>${e.city} · ${e.title}</option>`).join('');
  $('#studio-event').value=state.selectedEvent;
  if(!state.creative){$('#creative-preview').innerHTML='<div class="preview-empty"><span>✦</span><b>Здесь появится публикация</b><small>Выберите настройки и запустите генерацию</small></div>';return}
  const c=state.creative;
  $('#creative-preview').innerHTML=`<div class="creative-card"><div class="creative-visual"><h3>${c.event.title}</h3></div><div class="creative-body"><div class="creative-meta"><span>${c.channel}</span><span>${c.provider}</span></div><textarea id="creative-text">${c.text}</textarea><div class="url-line"><code>${c.url}</code><button data-copy="${c.url}">Копировать</button></div><div class="creative-actions"><button class="primary" id="approve-share">Утвердить и открыть отправку</button><button class="soft" id="regenerate">Другой вариант</button></div></div></div>`;
  bindCopy();
  $('#approve-share').onclick=()=>{state.creative.text=$('#creative-text').value;addEvent('share.opened',`${c.channel}: открыт подготовленный share-kit; доставка не утверждается`);toast('Отправка не выполнена — зафиксировано только открытие share-kit')};
  $('#regenerate').onclick=generate;
}
function generate(){
  const e=eventById($('#studio-event').value);state.selectedEvent=e.id;
  const channel=$('#studio-channel').value,provider=$('#studio-provider').value,tone=$('#studio-tone').value;
  const intro=tone.startsWith('Личный')?'Друзья, хочу поделиться полезной встречей.':tone.startsWith('Энергичный')?'Челябинск, встречаемся на живом мастер-классе!':'Приглашаю собственников бизнеса на практический мастер-класс.';
  const fact=e.synthetic?'Это синтетическое событие для проверки механики.':`${e.date}, ${e.venue}. Стоимость: ${e.price}.`;
  state.creative={event:e,channel,provider,tone,text:`${intro}\n\n${e.title}.\n${fact}\n\nМожно заранее пройти бизнес-тест и прийти с конкретными вопросами.`,url:`demo.academy/event/7K4M?e=${encodeURIComponent(e.id)}&c=demo-01`};
  addEvent('content.generated',`${provider}: создан черновик для ${channel}; внешняя модель не вызывалась`);
}
function renderChannels(){
  $('#channels').innerHTML=Object.entries(state.channels).map(([name,on])=>`<article class="channel"><label><input type="checkbox" data-channel="${name}" ${on?'checked':''}> ${name}</label><small>${on?'Материалы создаются':'Не используется'}</small></article>`).join('');
  $$('[data-channel]').forEach((x)=>x.onchange=()=>{state.channels[x.dataset.channel]=x.checked;addEvent('channel.preference_changed',`${x.dataset.channel}: ${x.checked?'включён':'выключен'} только для синтетического профиля`)})
}
function renderOwner(){
  const e=eventById(state.selectedEvent);
  $('#owner-event-card').innerHTML=`<p class="kicker">БЛИЖАЙШЕЕ МЕРОПРИЯТИЕ</p><h2>${e.title}</h2><p><b>${e.city}</b> · ${e.date}<br>${e.time} · ${e.venue}<br>${e.price}</p><button class="primary" id="owner-register" ${state.ownerRegistered?'disabled':''}>${state.ownerRegistered?'Вы зарегистрированы':'Записаться синтетически'}</button>`;
  $('#owner-register').onclick=()=>{state.ownerRegistered=true;state.externalOpened=true;addEvent('event.registered',`SYNTH-OWNER-001 зарегистрирован на ${e.id}; referrer DEMO-7K4M сохранён`)};
  $('#complete-test').textContent=state.ownerTested?'Синтетический тест завершён':'Пройти синтетический тест';$('#complete-test').disabled=state.ownerTested;
}
function renderSpeaker(){
  $('#speaker-registered').textContent=state.ownerRegistered?'1':'0';$('#speaker-tested').textContent=state.ownerTested?'1':'0';
  $('#attendees').innerHTML=!state.ownerRegistered?'<div class="empty-state"><b>Пока нет синтетических регистраций</b><br>Зарегистрируйте тестового собственника на соседнем экране.</div>':`<article class="attendee"><div><b>Участник SYNTH-001</b><br><small>${eventById(state.selectedEvent).title}<br>Источник: Batman 7K4M</small></div><div><b>${state.ownerTested?'Тест пройден':'Тест не пройден'}</b><small>Контакты скрыты</small></div><div><b>${state.ownerTested?'Организация':'—'}</b><div class="scorebar"><i style="width:${state.ownerTested?'72':'0'}%"></i></div><small>демо-показатель</small></div><div><b>${state.ownerTested?'Подготовить вопрос':'Ожидает'}</b><small>Без автоматического диагноза</small></div></article>`;
}
function renderLedger(){$('#ledger').innerHTML=state.ledger.map((e)=>`<div class="ledger-row"><time>${new Date(e.at).toLocaleString('ru-RU')}</time><code>${e.type}</code><span>${e.detail}</span></div>`).join('')}
function renderProgress(){
  $('#step-share').classList.toggle('done',state.ledger.some((e)=>e.type==='share.opened'));$('#step-share small').textContent=state.ledger.some((e)=>e.type==='share.opened')?'share-kit открыт':'ожидает действия';
  $('#step-open').classList.toggle('done',state.externalOpened);$('#step-open small').textContent=state.externalOpened?'переход подтверждён':'ожидает перехода';
  $('#step-result').classList.toggle('done',state.ownerRegistered||state.ownerTested);$('#step-result small').textContent=state.ownerTested?'тест завершён':state.ownerRegistered?'регистрация подтверждена':'ожидает результата';
  $('#result-count').textContent=Number(state.ownerRegistered)+Number(state.ownerTested);
}
function bindCopy(){$$('[data-copy]').forEach((b)=>b.onclick=async()=>{await navigator.clipboard?.writeText(b.dataset.copy);toast('Ссылка скопирована')})}
function renderAll(){renderStudio();renderChannels();renderEvents($('.filter.active')?.dataset.filter||'all');renderOwner();renderSpeaker();renderLedger();renderProgress();bindCopy()}
$$('[data-view]').forEach((b)=>b.onclick=()=>showView(b.dataset.view));
$$('.filter').forEach((b)=>b.onclick=()=>{$$('.filter').forEach((x)=>x.classList.remove('active'));b.classList.add('active');renderEvents(b.dataset.filter)});
$('#generate').onclick=generate;
$('#studio-event').onchange=(e)=>{state.selectedEvent=e.target.value;save()};
$('#complete-test').onclick=()=>{state.ownerTested=true;state.externalOpened=true;addEvent('business_test.completed','SYNTH-RESULT-001 завершён; owner_id SYNTH-OWNER-001; referrer DEMO-7K4M сохранён')};
$('#open-material').onclick=()=>{state.materialOpened=true;addEvent('owner.material_opened','Открыт вводный синтетический материал Академии');toast('Материал отмечен как открытый')};
$('#reset-demo').onclick=()=>{if(confirm('Сбросить только синтетические события этого браузера?')){state=defaultState();save();toast('Синтетика сброшена')}};
renderAll();

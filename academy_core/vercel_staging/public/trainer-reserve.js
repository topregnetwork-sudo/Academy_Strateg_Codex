const reserveStatus=document.querySelector('#reserve-status');
const reserveResult=document.querySelector('#reserve-result');
const offer=document.querySelector('#reserve-offer');
const consent=document.querySelector('#reserve-consent');
const route=document.querySelector('#reserve-route');
const toast=document.querySelector('#toast');
function notify(text){toast.textContent=text;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2200)}
offer.onclick=()=>{reserveStatus.textContent='Предложение роли Batman подготовлено · не отправлено';reserveResult.textContent='Событие: trainer_reserve.offer_prepared. Получатель и реальные каналы не использовались.';consent.disabled=false;notify('Предложение подготовлено только локально')};
consent.onclick=()=>{reserveStatus.textContent='Синтетическое согласие зафиксировано';reserveResult.textContent='Событие: trainer_reserve.consent_recorded. В production потребуется подтверждённый ответ самого кандидата.';route.disabled=false;notify('Синтетическое согласие сохранено')};
route.onclick=()=>{reserveStatus.textContent='Batman-вход подготовлен · активации нет';reserveResult.textContent='Событие: batman.journey_prepared; source_id=trainer_reserve. btm_id не выдан: участник должен пройти самостоятельные этапы Batman.';notify('Маршрут подготовлен без отправки и активации')};

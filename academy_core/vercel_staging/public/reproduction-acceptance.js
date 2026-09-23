const items=[
['Старт и инструкция','12 заданий, самостоятельное выполнение, без пауз и дополнительной информации; ограничений времени нет, фактическое время учитывается.'],
['Задание 1','Самостоятельный ввод фамилии, имени и отчества заглавными буквами.'],
['Задание 2','Пять квадратов с диагоналями; галочка над каждой из двух одинаковых картинок.'],
['Задание 3','Три текстовых варианта про осторожное вождение; один ответ.'],
['Задание 4','Пять прямоугольников с перегородками; галочка под каждой одинаковой картинкой.'],
['Задание 5','Три варианта предпочтения типа автомобиля; один ответ.'],
['Задание 6','Пять кругов с перегородками и точками; галочка над двумя одинаковыми картинками.'],
['Задание 7','Три текстовых варианта о самостоятельности действий; один ответ.'],
['Задание 8','Пять треугольников с перегородками и точками; галочка под двумя одинаковыми картинками.'],
['Задание 9','Три утверждения о квадрате, круге и треугольнике; один ответ.'],
['Задание 10','Четыре стрелочные композиции; галочка справа от выбранного рисунка.'],
['Задание 11','Четыре пары линий; галочка слева от более длинной линии в каждой паре.'],
['Задание 12','Повторный ввод фамилии и отчества заглавными буквами; имя без дополнительного требования к регистру.'],
['Позиции отметок','У каждой фигуры доступны верх, низ, лево и право; протокол сохраняет точную позицию и лишние отметки.'],
['Таймер и переходы','Таймер идёт вверх; доступны Назад, Далее и карта 1–12; переходы и время фиксируются.'],
['Resume и события','Проверить ожидаемое восстановление попытки после reload, а также focus/visibility events.'],
['Финальный экран','Только благодарность и подтверждение приёма; без скачиваний, оценки и служебных пояснений.'],
['PDF и XLSX','Проверить 12 строк, фигуру и позицию отметки, время, визиты, результат, проверяющего, дату и комментарий.']
];
const key='academy:reproduction:owner-acceptance:v1';
let state=JSON.parse(localStorage.getItem(key)||'{}');
const root=document.getElementById('checklist');
items.forEach(([title,description],i)=>{const id=String(i+1),value=state[id]?.decision||'',note=state[id]?.note||'',box=document.createElement('section');box.className='check';box.innerHTML=`<h2>${id}. ${title}</h2><p>${description}</p><div class="decision"><label><input type="radio" name="d${id}" value="accept" ${value==='accept'?'checked':''}>Принять</label><label><input type="radio" name="d${id}" value="fix" ${value==='fix'?'checked':''}>Исправить</label></div><textarea placeholder="Точный комментарий или расхождение">${note}</textarea>`;box.querySelectorAll('input').forEach(x=>x.onchange=()=>save(id,box));box.querySelector('textarea').oninput=()=>save(id,box);root.append(box)});
function save(id,box){state[id]={decision:box.querySelector('input:checked')?.value||'',note:box.querySelector('textarea').value.trim()};localStorage.setItem(key,JSON.stringify(state));render()}
function render(){const decided=Object.values(state).filter(x=>x.decision).length;document.getElementById('summary').textContent=`${decided} из ${items.length} проверено`;const lines=['ПРИЁМКА ТЕСТА НА ВОСПРОИЗВЕДЕНИЕ','Статус продукта: OWNER_REVIEW_REQUIRED',''];items.forEach(([title],i)=>{const x=state[String(i+1)]||{};lines.push(`${i+1}. ${title}: ${x.decision==='accept'?'ПРИНЯТЬ':x.decision==='fix'?'ИСПРАВИТЬ':'НЕ ПРОВЕРЕНО'}${x.note?` — ${x.note}`:''}`)});lines.push('',`Итог: ${decided===items.length&&Object.values(state).every(x=>x.decision==='accept')?'ВСЕ ПУНКТЫ ПРИНЯТЫ':'ВЕРСИЯ НЕ ЗАМОРОЖЕНА'}`);document.getElementById('result').value=lines.join('\n')}
document.getElementById('reload-test').onclick=()=>{document.getElementById('test-frame').src=`/reproduction-test.html?rev=57&assignment_id=owner-acceptance-${Date.now()}&candidate_name=Проверка%20владельцем`};
document.getElementById('copy-result').onclick=async()=>{render();await navigator.clipboard.writeText(document.getElementById('result').value)};
document.getElementById('reset-review').onclick=()=>{if(confirm('Очистить все решения приёмки?')){state={};localStorage.removeItem(key);location.reload()}};
render();

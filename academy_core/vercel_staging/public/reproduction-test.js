const qs=new URLSearchParams(location.search);
const assignment={assignmentId:qs.get('assignment_id')||'demo-reproduction-003',candidateId:qs.get('candidate_id')||'demo-candidate',candidateName:qs.get('candidate_name')||'Тестовый кандидат'};
const letters=['а','б','в','г','д'];
const positions=['top','left','right','bottom'];
const line=(x1,y1,x2,y2)=>`<line class="s" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
const dot=(x,y)=>`<circle class="d" cx="${x}" cy="${y}" r="2.35"/>`;
const svg=body=>`<svg viewBox="0 0 100 90" aria-hidden="true">${body}</svg>`;
const square='<rect class="s" x="19" y="10" width="62" height="70"/>';
// Coordinates traced from the owner-supplied two-page source.
const q2=[svg(square+line(19,10,50,45)),svg(square+line(19,80,50,45)),svg(square+line(50,45,81,10)),svg(square+line(19,10,50,45)),svg(square+line(50,45,81,80))];
const rect='<rect class="s" x="17" y="12" width="66" height="66"/>';
const q4=[svg(rect+line(50,12,50,45)+line(17,45,83,45)),svg(rect+line(50,12,50,78)+line(50,45,83,45)),svg(rect+line(50,12,50,78)+line(17,45,50,45)),svg(rect+line(50,12,50,78)+line(50,45,83,45)),svg(rect+line(17,45,83,45)+line(50,45,50,78))];
const circle='<circle class="s" cx="50" cy="45" r="34"/>';
const cross=line(50,11,50,79)+line(16,45,84,45);
const q6=[
 svg(circle+cross+dot(32,33)+dot(40,27)+dot(66,31)+dot(66,60)),
 svg(circle+cross+dot(66,31)+dot(32,56)+dot(40,64)+dot(66,60)),
 svg(circle+cross+dot(35,31)+dot(61,27)+dot(69,34)+dot(66,60)),
 svg(circle+cross+dot(66,31)+dot(35,60)+dot(60,59)+dot(69,67)),
 svg(circle+cross+dot(32,33)+dot(40,27)+dot(66,31)+dot(66,60))
];
const tri='<path class="s" d="M50 7L14 80L86 80Z"/>';
const triVertical=line(50,7,50,80),junction=[50,49],leftEdge=[32,43],rightEdge=[68,43];
const q8=[
 svg(tri+triVertical+line(...leftEdge,...junction)+line(...junction,...rightEdge)+line(...junction,86,80)+dot(42,31)+dot(33,63)+dot(68,55)),
 svg(tri+triVertical+line(14,80,...junction)+line(...junction,...rightEdge)+dot(42,31)+dot(30,58)+dot(64,68)),
 svg(tri+triVertical+line(14,80,...junction)+line(...leftEdge,...junction)+line(...junction,...rightEdge)+dot(42,31)+dot(58,31)+dot(34,68)),
 svg(tri+triVertical+line(...leftEdge,...junction)+line(...junction,...rightEdge)+line(...junction,86,80)+dot(58,31)+dot(33,61)+dot(63,68)),
 svg(tri+triVertical+line(14,80,...junction)+line(...leftEdge,...junction)+line(...junction,...rightEdge)+dot(42,31)+dot(58,31)+dot(34,68))
];
const arrow=(x1,y1,x2,y2)=>{const a=Math.atan2(y2-y1,x2-x1),l=8,spread=.62;return line(x1,y1,x2,y2)+line(x2,y2,x2-l*Math.cos(a-spread),y2-l*Math.sin(a-spread))+line(x2,y2,x2-l*Math.cos(a+spread),y2-l*Math.sin(a+spread))};
const q10=[
 svg(arrow(10,34,45,34)+arrow(10,56,45,56)+arrow(90,34,55,34)+arrow(90,56,55,56)),
 svg(arrow(50,10,50,40)+arrow(50,80,50,50)+arrow(46,45,15,45)+arrow(54,45,85,45)),
 svg(arrow(47,34,12,34)+arrow(47,56,12,56)+arrow(53,34,88,34)+arrow(53,56,88,56)),
 svg(line(84,45,47,45)+arrow(47,45,12,45)+line(20,15,47,45)+arrow(47,45,76,74)+line(53,82,53,45)+arrow(53,45,53,8)+line(22,72,53,45)+arrow(53,45,78,18))
];
const tasks=[
 {id:'r01',type:'identity',prompt:'Заполните поля ниже, написав ваше имя заглавными буквами.',fields:['lastName','firstName','middleName'],uppercase:['firstName']},
 {id:'r02',type:'marks',prompt:'Поставьте галочку (✓) над каждой из двух одинаковых картинок ниже.',requestedPosition:'top',visuals:q2,expectedFigures:['1','4']},
 {id:'r03',type:'single',prompt:'Отметьте соответствующий флажок — только один ответ.',options:['Если другие будут водить машину осторожно, я могу избежать аварий.','Я, вероятно, никогда не попаду в аварию.','Я попытаюсь избежать аварий, водя машину осторожно.']},
 {id:'r04',type:'marks',prompt:'Поставьте галочку (✓) над каждой из двух одинаковых картинок ниже.',requestedPosition:'top',visuals:q4,expectedFigures:['2','4']},
 {id:'r05',type:'single',prompt:'Отметьте соответствующий флажок — только один ответ.',options:['Я предпочитаю автомобили с открытым верхом.','Я предпочитаю микроавтобусы.','Я предпочитаю автомобили типа «седан».']},
 {id:'r06',type:'marks',prompt:'Поставьте галочку (✓) над каждой из двух одинаковых картинок ниже.',requestedPosition:'top',visuals:q6,expectedFigures:['1','5']},
 {id:'r07',type:'single',prompt:'Отметьте соответствующий флажок — только один ответ.',options:['Я редко делаю что-то, если другие не хотят, чтобы я делал это.','Я могу делать то, что я хочу, если другие не останавливают меня.','Я обычно могу делать то, что я хочу делать.']},
 {id:'r08',type:'marks',prompt:'Поставьте галочку (✓) над каждой из двух одинаковых картинок ниже.',requestedPosition:'top',visuals:q8,expectedFigures:['3','5']},
 {id:'r09',type:'single',prompt:'Отметьте соответствующий флажок — только один ответ.',options:['У всех квадратов четыре стороны.','Круг может поместиться в квадрате.','Треугольник может поместиться в круге.']},
 {id:'r10',type:'marks',prompt:'Поставьте галочку (✓) сбоку от рисунка, который нравится вам больше всего.',requestedPosition:'right',visuals:q10,expectedCount:1},
 {id:'r11',type:'blocks',prompt:'Поставьте галочку (✓) сбоку от более длинной линии в каждой паре.',requestedPosition:'left',pairs:[[82,64],[58,84],[76,61],[68,80]]},
 {id:'r12',type:'identity',prompt:'Заполните поля ниже, написав вашу фамилию и отчество (если есть) заглавными буквами.',fields:['middleName','firstName','lastName'],uppercase:['lastName','middleName']}
];
let state=null,current=0,tick=null,enteredAt=null,resumeCandidate=null;
const el=id=>document.getElementById(id),now=()=>new Date().toISOString(),storageKey=`academy:reproduction:v7:${assignment.assignmentId}`;
function fresh(){return{schemaVersion:'assessment-attempt.v2',assessmentId:'duplication-ability-12',assessmentVersion:'source-visuals-rev7-2026-09-21',assignment,startedAt:null,completedAt:null,completionReason:null,elapsedSeconds:0,currentTaskIndex:0,answers:{},taskMetrics:{},events:[{type:'page.opened',at:now()}]}}
function save(){localStorage.setItem(storageKey,JSON.stringify(state))}function event(type,extra={}){state.events.push({type,at:now(),...extra});save()}
function startClock(){clearInterval(tick);tick=setInterval(()=>{state.elapsedSeconds=Math.max(state.elapsedSeconds+1,Math.floor((Date.now()-new Date(state.startedAt).getTime())/1000));renderTimer();if(state.elapsedSeconds%5===0)save()},1000)}
function begin(){state=fresh();state.startedAt=now();event('assessment.started');el('intro-view').hidden=true;el('test-view').hidden=false;openTask(0);renderTimer();startClock()}
function resume(){state=resumeCandidate;state.elapsedSeconds=Math.max(state.elapsedSeconds||0,Math.floor((Date.now()-new Date(state.startedAt).getTime())/1000));state.events.push({type:'assessment.resumed',at:now()});el('intro-view').hidden=true;el('test-view').hidden=false;openTask(Math.min(tasks.length-1,state.currentTaskIndex||0));renderTimer();startClock();save()}
function renderTimer(){const s=state?.elapsedSeconds||0;el('timer').textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function leaveTask(){if(enteredAt!==null){const id=tasks[current].id,m=state.taskMetrics[id]||(state.taskMetrics[id]={visits:0,timeMs:0,firstOpenedAt:now()});m.timeMs+=performance.now()-enteredAt;enteredAt=null;save()}}
function openTask(index){leaveTask();current=index;state.currentTaskIndex=index;const t=tasks[index],m=state.taskMetrics[t.id]||(state.taskMetrics[t.id]={visits:0,timeMs:0,firstOpenedAt:now()});m.visits++;m.lastOpenedAt=now();enteredAt=performance.now();event('task.opened',{taskId:t.id,taskNumber:index+1});renderTask()}
function renderTask(){const t=tasks[current],root=el('task-content');root.innerHTML=`<h1>${current+1}. ${t.prompt}</h1>`;if(t.type==='identity')renderIdentity(root,t);if(t.type==='single')renderSingle(root,t);if(t.type==='marks')renderMarks(root,t);if(t.type==='blocks')renderBlocks(root,t);el('progress-label').textContent=`Задание ${current+1} из ${tasks.length}`;el('progress-fill').style.width=`${((current+1)/tasks.length)*100}%`;el('prev-button').disabled=current===0;el('next-button').hidden=current===tasks.length-1;el('finish-button').hidden=current!==tasks.length-1;renderMap()}
function renderIdentity(root,t){const answer=state.answers[t.id]||{};const labels={lastName:'Фамилия',firstName:'Имя',middleName:'Отчество (если есть)'},fields=t.fields||['lastName','firstName','middleName'];const grid=document.createElement('div');grid.className='field-grid';fields.forEach(key=>{const w=document.createElement('label');w.innerHTML=`<span>${labels[key]}</span><input autocomplete="off" value="${escapeHtml(answer[key]||'')}">`;w.querySelector('input').oninput=e=>{state.answers[t.id]={...(state.answers[t.id]||{}),[key]:e.target.value};event('answer.saved',{taskId:t.id,field:key,value:e.target.value})};grid.append(w)});root.append(grid)}
function renderSingle(root,t){const answer=state.answers[t.id];const wrap=document.createElement('div');wrap.className='options';t.options.forEach((text,i)=>{const value=letters[i],label=document.createElement('label');label.className='option';label.innerHTML=`<input type="radio" name="${t.id}" value="${value}" ${answer===value?'checked':''}><span>${value}. ${text}</span>`;label.querySelector('input').onchange=()=>{state.answers[t.id]=value;event('answer.saved',{taskId:t.id,value});renderTask()};wrap.append(label)});root.append(wrap)}
function positionCheckbox(taskId,figure,pos,checked){const label=document.createElement('label');label.className=`position-check ${pos}`;label.title={top:'Сверху',bottom:'Снизу',left:'Слева',right:'Справа'}[pos];label.innerHTML=`<input type="checkbox" aria-label="Фигура ${figure}: ${label.title}" ${checked?'checked':''}>`;label.querySelector('input').onchange=()=>toggleMark(taskId,figure,pos);return label}
function renderMarks(root,t){const grid=document.createElement('div');grid.className='mark-grid';const answer=state.answers[t.id]||{};t.visuals.forEach((art,i)=>{const fig=String(i+1),card=document.createElement('div');card.className='mark-card';card.innerHTML=art;positions.forEach(pos=>card.append(positionCheckbox(t.id,fig,pos,(answer[fig]||[]).includes(pos))));grid.append(card)});root.append(grid)}
function toggleMark(taskId,figure,pos){const answer=structuredClone(state.answers[taskId]||{}),list=answer[figure]||[],at=list.indexOf(pos);if(at>=0)list.splice(at,1);else list.push(pos);if(list.length)answer[figure]=list;else delete answer[figure];state.answers[taskId]=answer;event('mark.toggled',{taskId,figure,position:pos,checked:at<0});renderTask()}
function renderBlocks(root,t){const detail=document.createElement('p');detail.className='instruction-detail';detail.textContent='Отметка сохраняется вместе с её положением относительно конкретной линии.';root.append(detail);const grid=document.createElement('div');grid.className='mark-pair-grid',answer=state.answers[t.id]||{};let fig=0;t.pairs.forEach(pair=>{const group=document.createElement('div');group.className='mark-pair';pair.forEach(width=>{fig++;const id=String(fig),card=document.createElement('div');card.className='mark-card';card.innerHTML=`<div class="block-shape" style="width:${width}px;height:2px"></div>`;positions.forEach(pos=>card.append(positionCheckbox(t.id,id,pos,(answer[id]||[]).includes(pos))));group.append(card)});grid.append(group)});root.append(grid)}
function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function answered(t){const a=state.answers[t.id];if(t.type==='identity')return Boolean(a?.lastName||a?.firstName);if(t.type==='single')return Boolean(a);return a&&Object.values(a).some(v=>v.length)}
function renderMap(){const map=el('task-map');map.innerHTML='';tasks.forEach((t,i)=>{const b=document.createElement('button');b.type='button';b.textContent=i+1;b.classList.toggle('visited',Boolean(state.taskMetrics[t.id]));b.classList.toggle('answered',answered(t));b.classList.toggle('active',i===current);b.onclick=()=>openTask(i);map.append(b)})}
function markObservation(t,a={}){const marks=[];Object.entries(a).forEach(([figure,list])=>list.forEach(position=>marks.push({figure,position})));return{requestedPosition:t.requestedPosition,totalMarks:marks.length,marksInRequestedPosition:marks.filter(m=>m.position===t.requestedPosition).length,marksOutsideRequestedPosition:marks.filter(m=>m.position!==t.requestedPosition).length,marks}}
function observation(t,a){if(t.type==='identity'){const uppercase={};(t.uppercase||[]).forEach(k=>uppercase[k]=Boolean(a?.[k])&&a[k]===a[k].toLocaleUpperCase('ru-RU'));return{requiredUppercaseFields:t.uppercase,uppercase,enteredFields:Object.keys(a||{}).filter(k=>a[k])}}if(t.type==='marks'||t.type==='blocks')return markObservation(t,a);return{selectedOption:a||null}}
function finish(reason='submitted'){leaveTask();clearInterval(tick);state.completedAt=now();state.completionReason=reason;state.events.push({type:'assessment.completed',at:state.completedAt});const protocol=getProtocol();localStorage.setItem(`${storageKey}:completed`,JSON.stringify(protocol));save();el('test-view').hidden=true;el('complete-view').hidden=false;document.title='Тест завершён — Академия Стратег'}
function getProtocol(){return{schemaVersion:'manual-review-package.v2',generatedAt:now(),assessment:{id:state.assessmentId,version:state.assessmentVersion,title:'Тест на воспроизведение',scoringMode:'manual',officialScore:null},assignment:state.assignment,attempt:{startedAt:state.startedAt,completedAt:state.completedAt,completionReason:state.completionReason,elapsedSeconds:state.elapsedSeconds},summary:{answeredTasks:tasks.filter(answered).length,totalTasks:tasks.length},responses:tasks.map((t,i)=>({number:i+1,taskId:t.id,instruction:t.prompt,answer:state.answers[t.id]??null,observation:observation(t,state.answers[t.id]),metrics:state.taskMetrics[t.id]||null})),events:state.events}}
document.addEventListener('visibilitychange',()=>{if(state?.startedAt&&!state.completedAt)event(document.hidden?'page.hidden':'page.visible')});window.addEventListener('blur',()=>{if(state?.startedAt&&!state.completedAt)event('window.blur')});window.addEventListener('focus',()=>{if(state?.startedAt&&!state.completedAt)event('window.focus')});
try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved?.startedAt&&!saved?.completedAt&&saved?.assignment?.assignmentId===assignment.assignmentId){resumeCandidate=saved;el('start-button').textContent='Продолжить тест'}}catch{}
el('candidate-name').textContent=assignment.candidateName;el('acknowledge').onchange=e=>el('start-button').disabled=!e.target.checked;el('start-button').onclick=()=>resumeCandidate?resume():begin();el('prev-button').onclick=()=>openTask(Math.max(0,current-1));el('next-button').onclick=()=>openTask(Math.min(tasks.length-1,current+1));el('finish-button').onclick=()=>finish();
window.__REPRO_TEST_QA__={getState:()=>structuredClone(state),getProtocol:()=>state?getProtocol():null,openTask,finish,fillDemo:()=>{state.answers={r01:{lastName:'ИВАНОВ',firstName:'ИВАН',middleName:'ИВАНОВИЧ'},r02:{'1':['top'],'4':['top']},r03:'в',r04:{'2':['top'],'4':['top']},r05:'б',r06:{'1':['top'],'5':['top']},r07:'в',r08:{'3':['top'],'5':['top']},r09:'а',r10:{'2':['right']},r11:{'1':['left'],'4':['left'],'5':['left'],'8':['left']},r12:{lastName:'ИВАНОВ',firstName:'Иван',middleName:'ИВАНОВИЧ'}};save();renderTask()}};

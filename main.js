/*
AGPL-3.0-or-later — https://github.com/leveled-up
*/
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

// Elemente
const idleTitle = document.title;
const startBtn  = $("#startBtn");
const resetBtn  = $("#resetBtn");
const skipBtn   = $("#skipBtn");
const timeEl    = $("#time");
const progress  = $(".progress");
const roundEl   = $("#roundInfo");
const statusEl  = $("#status");
const tabBtns   = $$("#modeTabs > button");
const ding      = $("#ding");

// Konfig
const steps = [
  { key:"focus",      dur: 25*60*1000, text:"Time to focus!" },
  { key:"shortbreak", dur:  5*60*1000, text:"Time for a break!" },
  { key:"longbreak",  dur: 15*60*1000, text:"Time for a break!" }
];
const ROUNDS_UNTIL_LONG = 4;
const ringUrl = "ring.mp3";

// Zustand
let stepIndex = 0;
let round = Number(localStorage.getItem("lf_round") || "1");
let timeLeft = steps[0].dur;
let startTime = null;
let tickId = null;
let endId  = null;

// Helpers
const pad = n => String(n).split(".")[0].padStart(2,"0");
const fmt = ms => {
  const s = Math.max(0, Math.round(ms/1000));
  return `${pad(s/60)}:${pad(s%60)}`;
};
function setProgress(){
  const total = steps[stepIndex].dur;
  const left  = startTime ? timeLeft - (Date.now()-startTime) : timeLeft;
  const pct = Math.max(0, Math.min(100, (1 - left/total) * 100));
  progress.style.width = pct + "%";
}
function paint(){
  const left = startTime ? timeLeft - (Date.now()-startTime) : timeLeft;
  timeEl.textContent = fmt(left);
  setProgress();
  if(startTime) document.title = `${fmt(left)} - ${steps[stepIndex].text}`;
}
function setModeByKey(key){
  const i = steps.findIndex(s=>s.key===key);
  setModeByIndex(i < 0 ? 0 : i);
}
function setModeByIndex(i){
  stepIndex = i;
  timeLeft = steps[i].dur;
  document.body.className = steps[i].key;
  statusEl.textContent = steps[i].text;
  tabBtns.forEach((b)=> b.classList.toggle("active", b.dataset.mode === steps[i].key));
  paint();
}
function start(){
  if(tickId) return;
  startTime = Date.now();
  tickId = setInterval(tick, 1000);
  endId  = setTimeout(end, timeLeft);
  startBtn.textContent = "PAUSE";
  startBtn.classList.remove("idle");
}
function pause(){
  if(!tickId) return;
  clearInterval(tickId); tickId = null;
  clearTimeout(endId);    endId  = null;
  timeLeft -= (Date.now() - startTime);
  startTime = null;
  startBtn.textContent = "START";
  startBtn.classList.add("idle");
  document.title = idleTitle;
  paint();
}
function reset(){
  pause();
  timeLeft = steps[stepIndex].dur;
  paint();
}
function skip(){
  pause();
  timeLeft = 0;
  end();
}
function tick(){
  const left = timeLeft - (Date.now() - startTime);
  if(left <= 0){ end(); return; }
  paint();
}
function end(){
  try{
    if(ding){ ding.currentTime = 0; ding.play(); }
    else { new Audio(ringUrl).play().catch(()=>{}); }
  }catch(e){}
  if(stepIndex === 0){
    const longNow = (round % ROUNDS_UNTIL_LONG) === 0;
    setModeByIndex(longNow ? 2 : 1);
  }else{
    round = (round % ROUNDS_UNTIL_LONG) + 1;
    localStorage.setItem("lf_round", String(round));
    setModeByIndex(0);
  }
  roundEl.textContent = `#${round}`;
  startTime = null;
  startBtn.textContent = "START";
  startBtn.classList.add("idle");
  document.title = idleTitle;
  paint();
}

// Button-Events
startBtn?.addEventListener("click", ()=> tickId ? pause() : start());
resetBtn?.addEventListener("click", reset);
skipBtn ?.addEventListener("click", skip);

// Tabs
tabBtns.forEach((b)=>{
  b.addEventListener("click", ()=>{
    pause();
    setModeByKey(b.dataset.mode);
  });
});

// Hotkeys
document.addEventListener("keydown", (e)=>{
  if(e.code==="Space" || e.code==="Enter"){
    e.preventDefault();
    tickId ? pause() : start();
  }
});

// Init
setModeByIndex(0);
roundEl.textContent = `#${round}`;
paint();

/* ---------- Tasks (optional, läuft nur wenn HTML vorhanden) ---------- */
const taskForm  = $("#taskForm");
const taskInput = $("#taskInput");
const taskList  = $("#taskList");
const clearDone = $("#clearDone");
const TASK_KEY  = "lf_tasks";

function loadTasks(){ try{return JSON.parse(localStorage.getItem(TASK_KEY)||"[]");}catch{ return []; } }
function saveTasks(t){ localStorage.setItem(TASK_KEY, JSON.stringify(t)); }
function renderTasks(){
  if(!taskList) return;
  const tasks = loadTasks();
  taskList.innerHTML = "";
  tasks.forEach((t,i)=>{
    const li = document.createElement("li");
    li.className = "task";
    li.innerHTML = `
      <input type="checkbox" ${t.done?"checked":""} />
      <div class="title">${t.title}</div>
      <button class="del">✕</button>`;
    li.querySelector("input").addEventListener("change",(e)=>{
      tasks[i].done = e.target.checked; saveTasks(tasks); renderTasks();
    });
    li.querySelector(".del").addEventListener("click",()=>{
      tasks.splice(i,1); saveTasks(tasks); renderTasks();
    });
    taskList.appendChild(li);
  });
}
taskForm?.addEventListener("submit",(e)=>{
  e.preventDefault();
  const title = (taskInput?.value || "").trim();
  if(!title) return;
  const tasks = loadTasks(); tasks.push({title, done:false}); saveTasks(tasks);
  taskInput.value = ""; renderTasks();
});
clearDone?.addEventListener("click", ()=>{
  const tasks = loadTasks().filter(t=>!t.done); saveTasks(tasks); renderTasks();
});
renderTasks();

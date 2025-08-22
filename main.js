/*
Copyright (C) 2024 <https://github.com/leveled-up>
AGPL-3.0-or-later
*/

// Query helpers
const $  = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

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
let stepIndex = 0; // 0=focus,1=short,2=long
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
function setModeByIndex(i){
  stepIndex = i;
  timeLeft = steps[i].dur;
  document.body.className = steps[i].key;
  statusEl.textContent = steps[i].text;
  tabBtns.forEach((b,idx)=> b.classList.toggle("active", idx===i));
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
  end(); // sofort beenden
}
function tick(){
  const left = timeLeft - (Date.now() - startTime);
  if(left <= 0){ end(); return; }
  paint();
}
function end(){
  // Sound
  try{
    if(ding){ ding.currentTime = 0; ding.play(); }
    else { new Audio(ringUrl).play().catch(()=>{}); }
  }catch(e){}
  // Mode wechseln
  if(stepIndex === 0){
    // Fokus -> Break (short/long)
    const longNow = (round % ROUNDS_UNTIL_LONG) === 0;
    setModeByIndex(longNow ? 2 : 1);
  }else{
    // Break -> Fokus + Runde++
    round = (round % ROUNDS_UNTIL_LONG) + 1;
    localStorage.setItem("lf_round", String(round));
    setModeByIndex(0);
  }
  roundEl.textContent = `#${round}`;
  // zurück in Idle
  startTime = null;
  startBtn.textContent = "START";
  startBtn.classList.add("idle");
  document.title = idleTitle;
  paint();
}

// Events
startBtn.addEventListener("click", ()=> tickId ? pause() : start());
resetBtn.addEventListener("click", reset);
skipBtn .addEventListener("click", skip);

// Tabs
tabBtns.forEach((b,idx)=>{
  b.addEventListener("click", ()=>{
    pause();
    setModeByIndex(idx);
  });
});

// Hotkeys Space/Enter
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

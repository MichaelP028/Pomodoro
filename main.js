/*
Copyright (C) 2024 <https://github.com/leveled-up>
AGPL-3.0-or-later
*/

// jQuery-like shorthand
const $ = document.querySelector.bind(document);

// Element references
const idleTitle = document.title;
const startBtn   = $(".toggle>button");      // START/PAUSE
const resetBtn   = $("#resetBtn");
const skipBtn    = $("#skipBtn");
const timerEl    = $(".timer");
const progress   = $(".progress");
const counterEl  = $(".counter");
const stepTextEl = $(".step-text");
const stepBtns   = [...document.querySelectorAll(".steps>button")];

// Config
const steps = [
  { name: "focus",      dur: 25 * 60 * 1000, text: "Time to focus!" },
  { name: "shortbreak", dur:  5 * 60 * 1000, text: "Time for a break!" },
  { name: "longbreak",  dur: 15 * 60 * 1000, text: "Time for a break!" }
];
const ringUrl = "ring.mp3";
const ROUNDS_UNTIL_LONG = 4;

// Global state
let currentStep = 0;                                // 0=focus,1=short,2=long
let count = Number(localStorage.getItem("lf_round") || "1");
let timeLeft = steps[0].dur;
let startTime = null;
let timeout = null;
let refreshInterval = null;

// --- helpers ---
const toStr = n => n.toString().split(".")[0].padStart(2, "0");
const fmt   = ms => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${toStr(s/60)}:${toStr(s%60)}`;
};
const setTitle = (ms) => document.title = `${fmt(ms)} - ${steps[currentStep].text}`;
const setUIActiveTab = () => {
  stepBtns.forEach((b,i) => b.classList.toggle("active", i === currentStep));
  document.body.className = steps[currentStep].name;
  stepTextEl.textContent = steps[currentStep].text;
};

// --- core ---
const tick = () => {
  let passed = startTime ? (Date.now() - startTime) : 0;
  let left = timeLeft - passed;

  // progress
  const pct = 100 - (left / steps[currentStep].dur) * 100;
  progress.style.width = `${Math.max(0, Math.min(100, pct))}%`;

  // time text + title
  timerEl.textContent = fmt(left);
  if (startTime) setTitle(left);

  if (left <= 0) end();
};

const start = () => {
  if (refreshInterval) return;
  startTime = Date.now();
  refreshInterval = setInterval(tick, 1000);
  timeout = setTimeout(end, timeLeft);
  startBtn.onclick = pause;
  startBtn.textContent = "PAUSE";
  startBtn.classList.remove("idle");
  tick();
};

const pause = () => {
  clearInterval(refreshInterval);
  clearTimeout(timeout);
  refreshInterval = null;
  timeout = 0;
  if (startTime) timeLeft -= (Date.now() - startTime);
  startTime = null;
  startBtn.onclick = start;
  startBtn.textContent = "START";
  startBtn.classList.add("idle");
  document.title = idleTitle;
  tick(); // refresh UI immediately
};

const reset = () => {
  pause();
  timeLeft = steps[currentStep].dur;
  tick();
};

const skip = () => {
  // sofort aktuelle Phase beenden
  if (refreshInterval) pause();
  timeLeft = 0;
  tick(); // triggert end()
};

const end = () => {
  // Ring
  try { new Audio(ringUrl).play(); } catch (err) { /* ignore */ }

  startTime = null;

  if (currentStep === 0) {
    // von Fokus zu Pause wechseln (short/long)
    const nextIsLong = (count % ROUNDS_UNTIL_LONG) === 0;
    currentStep = nextIsLong ? 2 : 1;
  } else {
    // von Pause zurück zu Fokus + Runde hochzählen
    currentStep = 0;
    count += 1;
    localStorage.setItem("lf_round", String(count));
  }

  counterEl.textContent = `#${count}`;
  timeLeft = steps[currentStep].dur;
  setUIActiveTab();

  // zurück in IDLE
  startBtn.onclick = start;
  startBtn.textContent = "START";
  startBtn.classList.add("idle");
  document.title = idleTitle;

  tick();
};

// --- tab switching (Pomodoro/Short/Long) ---
stepBtns.forEach((btn, i) => {
  btn.addEventListener("click", () => {
    // nicht mitten im Lauf den Modus wechseln
    pause();
    currentStep = i;
    timeLeft = steps[currentStep].dur;
    setUIActiveTab();
    tick();
  });
});

// --- keyboard: Space/Enter toggles ---
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "Enter") {
    e.preventDefault();
    (refreshInterval ? pause : start)();
  }
});

// --- wire buttons ---
startBtn.onclick = start;
resetBtn && (resetBtn.onclick = reset);
skipBtn  && (skipBtn.onclick  = skip);

// --- init ---
counterEl.textContent = `#${count}`;
setUIActiveTab();
tick();

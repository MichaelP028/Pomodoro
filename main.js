/*
Copyright (C) 2024 <https://github.com/leveled-up>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// jQuery-like shorthand
const $ = document.querySelector.bind(document);

// Element references
const idleTitle = document.title;
const startBtn = $(".toggle>button");
const timer = $(".timer");
const progress = $(".progress");
const counter = $(".counter");
const stepText = $(".step-text");
const stepBtns = [...document.querySelectorAll(".steps>button")];

// Config
const steps = [
    { name: "focus", dur: 25 * 60 * 1000, text: "Time to focus!" },
    { name: "shortbreak", dur: 5 * 60 * 1000, text: "Time for a break!" },
    { name: "longbreak", dur: 15 * 60 * 1000, text: "Time for a break!" }
];
const ringUrl = "ring.mp3";

// Global vars
let currentStep = 0;
let count = 1;
let timeLeft = steps[0].dur;
let startTime = null;
let timeout = null;
let refreshInterval = null;

// main features
const start = () => {
    startTime = new Date().valueOf();
    refreshInterval = setInterval(tick, 1000);
    timeout = setTimeout(end, timeLeft);
    startBtn.onclick = pause;
    startBtn.innerText = "PAUSE";
    startBtn.classList.remove("idle");
    tick();
};

const pause = () => {
    clearInterval(refreshInterval);
    clearTimeout(timeout);
    refreshInterval = null;
    timeout = 0;
    let alreadyPassed = (new Date().valueOf() - startTime);
    timeLeft -= alreadyPassed;
    startTime = null;
    startBtn.onclick = start;
    startBtn.innerText = "START";
    startBtn.classList.add("idle");
    document.title = idleTitle;
};

const tick = () => {
    let alreadyPassed = 0;
    if (startTime)
        alreadyPassed = (new Date().valueOf() - startTime);
    let _timeLeft = (timeLeft - alreadyPassed);
    let percent = 100 - (_timeLeft / steps[currentStep].dur) * 100;
    progress.style.width = percent.toString() + "%";

    _timeLeft = Math.round(_timeLeft / 1000);
    let sec = _timeLeft % 60;
    let min = _timeLeft / 60;

    const toStr = n => n.toString().split(".")[0].padStart(2, "0");
    let str = toStr(min) + ":" + toStr(sec);
    timer.innerText = str;
    if (startTime)
        document.title = str + " - " + steps[currentStep].text;
};

const end = () => {
    // Ring
    try {
        let audio = new Audio(ringUrl);
        audio.play();
    } catch (err) {
        console.debug(err);
    }

    // Next step
    startTime = null;
    if (currentStep == 0)
        // Break: short or long?
        currentStep = (count % 4 == 0) ? 2 : 1;
    else {
        // Focus
        currentStep = 0;
        count += 1;
    }

    let stepProp = steps[currentStep];
    document.body.className = stepProp.name;

    counter.innerText = "#" + count.toString();
    stepText.innerText = steps[currentStep].text;

    timeLeft = stepProp.dur;
    startBtn.onclick = start;
    startBtn.innerText = "START";
    startBtn.classList.add("idle");
    document.title = idleTitle;

    for (let btn of stepBtns)
        btn.className = "";
    stepBtns[currentStep].className = "active";

    tick();
};

// define events
startBtn.onclick = start;
startBtn.addEventListener("keydown", event => {
    event.preventDefault();
});
document.addEventListener("keydown", event => {
    if (event.key == "Enter" || event.key == " ")
        startBtn.dispatchEvent(new Event("click"));
});

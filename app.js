import { levels } from "./levels.js";
import {
  rotate,
  bits,
  initial,
  move,
  replay,
  won,
  solve,
  signals,
  readProgress,
} from "./engine.js";
const $ = (s) => document.querySelector(s),
  key = "lumen-shift-v1";
let progress = { schema: 1, records: {} },
  index = 0,
  row = 0,
  state,
  redo = [],
  message = "Select a shutter. A small shift changes everything.",
  volatile = false,
  audio;
try {
  const raw = localStorage.getItem(key);
  if (raw) progress = readProgress(raw, levels);
} catch {
  message =
    "A saved file could not be read. This session starts with a clean instrument.";
}
function record() {
  return progress.records[levels[index].id] || { actions: [], hints: 0 };
}
function save() {
  progress.records[levels[index].id] = {
    actions: state.actions,
    hints: record().hints,
  };
  try {
    localStorage.setItem(key, JSON.stringify(progress));
  } catch {
    volatile = true;
  }
  $("#storage-status").textContent = volatile
    ? "This session is in memory only. Export progress before leaving."
    : "Progress stays in this browser. No accounts or network.";
}
function load(n) {
  index = n;
  row = levels[index].masks.findIndex(
    (_, i) => !levels[index].locked.includes(i),
  );
  state = replay(levels[index], record().actions);
  redo = [];
  message = levels[index].note;
  render();
}
function dots(value, width) {
  return `<div class="lamps" style="--width:${width}" aria-label="${bits(
    value,
    width,
  )
    .map((on) => (on ? "1" : "0"))
    .join(" ")}">${bits(value, width)
    .map(
      (on) =>
        `<span class="lamp ${on ? "on" : ""}" aria-hidden="true"><small>${on ? "1" : "0"}</small></span>`,
    )
    .join("")}</div>`;
}
function signal(label, value, width, extra = "", match = "") {
  return `<div class="signal-row ${extra}"><div class="signal-label">${label}</div>${dots(value, width)}<span class="row-match">${match}</span></div>`;
}
function render() {
  const level = levels[index],
    outputs = signals(level, state.offsets),
    complete = won(level, state),
    focused = document.activeElement?.id;
  $("#level-nav").innerHTML = levels
    .map(
      (l, i) =>
        `<button id="puzzle-${i}" data-level="${i}" class="${i === index ? "active" : ""}" aria-current="${i === index ? "step" : "false"}" aria-label="Puzzle ${i + 1}: ${l.name}${progress.records[l.id] && won(l, replay(l, progress.records[l.id].actions)) ? ", completed" : ""}"><span>${String(i + 1).padStart(2, "0")}</span>${l.name}<span class="done">${progress.records[l.id] && won(l, replay(l, progress.records[l.id].actions)) ? "✓" : ""}</span></button>`,
    )
    .join("");
  $("#level-number").textContent =
    `INSTRUMENT ${String(index + 1).padStart(2, "0")} / 08`;
  $("#level-title").textContent = level.name;
  $("#level-note").textContent = level.note;
  $("#moves").textContent = String(state.actions.length).padStart(2, "0");
  $("#board").innerHTML =
    signal("INPUT<span>START HERE ↓</span>", level.emitter, level.width) +
    level.masks
      .map(
        (mask, i) =>
          `<div class="register ${i === row ? "selected" : ""}" data-row="${i}"><div class="register-head"><button id="select-row-${i}" class="select-row" data-select="${i}" aria-pressed="${i === row}" ${level.locked.includes(i) ? "disabled" : ""}>${level.locked.includes(i) ? "▣ FIXED" : i === row ? "● SELECTED" : "○ SELECT"} / ${String(i + 1).padStart(2, "0")}</button><span>SHUTTER</span><span class="turn">INPUT TURNS ${level.turns[i] > 0 ? "←" : "→"} ${Math.abs(level.turns[i])}</span></div><div class="shutter-dots"><span class="signal-label">FLIP MASK ⊕</span>${dots(rotate(mask, state.offsets[i], level.width), level.width)}<span></span></div><div class="readout">${signal("READING ↓", outputs[i], level.width)}${Object.hasOwn(level.targets, i) ? signal(i === level.masks.length - 1 ? "RECEIVER" : "CHECKPOINT", level.targets[i], level.width, "target", outputs[i] === level.targets[i] ? "✓" : "·") : ""}</div></div>`,
      )
      .join("");
  $("#selected-name").textContent = `SHUTTER ${row + 1}`;
  $("#undo").disabled = !state.actions.length;
  $("#redo").disabled = !redo.length;
  const fullReplay = state.actions.length >= 2000;
  $("#shift-left").disabled = complete || fullReplay;
  $("#shift-right").disabled = complete || fullReplay;
  $("#hint").disabled = complete || fullReplay;
  $("#message").textContent = fullReplay && !complete
    ? "Replay limit reached. Undo, export, or reset before another shift."
    : message;
  $("#outcome").hidden = !complete;
  $("#result-note").textContent =
    `${state.actions.length} ${state.actions.length === 1 ? "shift" : "shifts"}. ${record().hints ? "Search hints used: " + record().hints + "." : "Found without a hint."} No timer was running.`;
  $("#next").textContent =
    index === levels.length - 1
      ? "Return to first light ↗"
      : "Next instrument →";
  document
    .querySelectorAll("[data-level]")
    .forEach((el) => (el.onclick = () => load(Number(el.dataset.level))));
  document.querySelectorAll("[data-select]").forEach(
    (el) =>
      (el.onclick = () => {
        row = Number(el.dataset.select);
        render();
      }),
  );
  document.querySelectorAll("[data-row]").forEach(
    (el) =>
      (el.onclick = (e) => {
        if (e.target.closest("button")) return;
        const n = Number(el.dataset.row);
        if (!level.locked.includes(n)) {
          row = n;
          render();
        }
      }),
  );
  if (focused && document.getElementById(focused))
    document.getElementById(focused).focus({ preventScroll: true });
}
function tone() {
  if (!$("#sound").checked) return;
  try {
    audio ||= new AudioContext();
    audio.resume();
    const oscillator = audio.createOscillator(),
      gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 220 + row * 55;
    gain.gain.setValueAtTime(0.025, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.2);
  } catch {
    $("#sound").checked = false;
  }
}
function shift(direction) {
  if (won(levels[index], state)) return;
  try {
    state = move(levels[index], state, { row, direction });
    redo = [];
    message = `Shutter ${row + 1} shifted ${direction === 1 ? "left" : "right"}. The edge wraps around.`;
    save();
    tone();
    render();
  } catch (error) {
    message = error.message;
    render();
  }
}
$("#shift-left").onclick = () => shift(1);
$("#shift-right").onclick = () => shift(-1);
$("#undo").onclick = () => {
  if (!state.actions.length) return;
  redo.push(state.actions.at(-1));
  state = replay(levels[index], state.actions.slice(0, -1));
  message = "One shift undone.";
  save();
  render();
};
$("#redo").onclick = () => {
  if (!redo.length) return;
  state = move(levels[index], state, redo.pop());
  message = "One shift restored.";
  save();
  render();
};
$("#reset").onclick = () => {
  state = initial(levels[index]);
  redo = [];
  progress.records[levels[index].id] = { actions: [], hints: 0 };
  message = "A fresh beginning. Same instrument.";
  save();
  render();
};
$("#hint").onclick = () => {
  const result = solve(levels[index], state);
  if (result.status === "replay-limit") {
    message = "The remaining replay space cannot fit a solution. Undo, export, or reset.";
  } else if (result.status !== "solved" || !result.actions.length) {
    message =
      "The bounded search did not return a hint. Your puzzle is unchanged.";
  } else {
    const action = result.actions[0];
    row = action.row;
    const item = record();
    progress.records[levels[index].id] = {
      actions: state.actions,
      hints: Math.min(2000, item.hints + 1),
    };
    message = `Try shutter ${row + 1} one step ${action.direction === 1 ? "left" : "right"}. Exact search found a ${result.actions.length}-shift route from here.`;
    save();
  }
  render();
};
$("#next").onclick = () => {
  load((index + 1) % levels.length);
  $("#instrument").scrollIntoView({ behavior: "smooth" });
};
$("#help-toggle").onclick = () => {
  const visible = $("#help").hidden;
  $("#help").hidden = !visible;
  $("#help-toggle").setAttribute("aria-expanded", String(visible));
};
document.addEventListener("keydown", (event) => {
  if (
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.target.closest("input,textarea,select") ||
    (event.target.closest("button") && ["Enter", " "].includes(event.key))
  )
    return;
  if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
    event.preventDefault();
    shift(event.key === "ArrowLeft" ? 1 : -1);
  } else if (["ArrowUp", "ArrowDown"].includes(event.key)) {
    event.preventDefault();
    const legal = levels[index].masks
      .map((_, i) => i)
      .filter((i) => !levels[index].locked.includes(i));
    row =
      legal[
        (legal.indexOf(row) +
          (event.key === "ArrowUp" ? -1 : 1) +
          legal.length) %
          legal.length
      ];
    render();
  }
});
function download(content, name) {
  const url = URL.createObjectURL(
      new Blob([content], { type: "application/json" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("#export").onclick = () =>
  download(JSON.stringify(progress, null, 2), "lumen-shift-progress.json");
$("#import").onclick = () => $("#save-file").click();
$("#save-file").onchange = async (event) => {
  const file = event.target.files[0];
  try {
    if (!file || file.size > 200000)
      throw new Error("Choose a save file below 200 KB");
    const next = readProgress(await file.text(), levels);
    progress = next;
    state = replay(levels[index], record().actions);
    redo = [];
    message = "Progress imported after replay validation.";
    save();
    render();
  } catch (error) {
    message =
      "Import rejected. Existing progress is unchanged: " + error.message;
    render();
  } finally {
    event.target.value = "";
  }
};
load(0);

import "./style.css";
import { ALL_SCALES, getScale } from "./tuning/scales.ts";
import { DEFAULT_PARAMS, SynthEngine } from "./synth/engine.ts";
import { Arpeggiator, DEFAULT_ARP_SETTINGS } from "./synth/arpeggiator.ts";
import { SvgGrid } from "./ui/grid.ts";
import { Controls } from "./ui/controls.ts";
import { KeyboardInput } from "./input/keyboard.ts";

// ─── Engine & initial state ───────────────────────────────────────────────────
const engine = new SynthEngine(DEFAULT_PARAMS);
const arpeggiator = new Arpeggiator(
  (id, freq) => engine.noteOn(id, freq),
  (id) => engine.noteOff(id),
  () => engine.noteOffAll(),
);
const initialScaleId = "just";
const initialRoot = 220;
const scale = getScale(initialScaleId);
let lastGridState = {
  scaleId: initialScaleId,
  rootFreq: initialRoot,
  octaveOffset: 0,
};

// ─── SVG Grid ────────────────────────────────────────────────────────────────
const grid = new SvgGrid(
  scale,
  initialRoot,
  0,
  (id, freq) => {
    void engine.resume();
    arpeggiator.noteOn(id, freq);
  },
  (id) => arpeggiator.noteOff(id),
);

// ─── Controls panel ──────────────────────────────────────────────────────────
const controls = new Controls(
  engine,
  grid,
  {
    scaleId: initialScaleId,
    layout: "hex",
    rootFreq: initialRoot,
    octaveOffset: 0,
    arpEnabled: DEFAULT_ARP_SETTINGS.enabled,
    arpBpm: DEFAULT_ARP_SETTINGS.bpm,
    arpDivision: DEFAULT_ARP_SETTINGS.division,
    arpMode: DEFAULT_ARP_SETTINGS.mode,
    arpOctaves: DEFAULT_ARP_SETTINGS.octaves,
    arpGate: DEFAULT_ARP_SETTINGS.gate,
  },
  (state) => {
    arpeggiator.update({
      enabled: state.arpEnabled,
      bpm: state.arpBpm,
      division: state.arpDivision,
      mode: state.arpMode,
      octaves: state.arpOctaves,
      gate: state.arpGate,
    });

    const gridChanged = state.scaleId !== lastGridState.scaleId ||
      state.rootFreq !== lastGridState.rootFreq ||
      state.octaveOffset !== lastGridState.octaveOffset;

    if (gridChanged) {
      arpeggiator.clear();
      grid.setScale(getScale(state.scaleId), state.rootFreq, state.octaveOffset);
      lastGridState = {
        scaleId: state.scaleId,
        rootFreq: state.rootFreq,
        octaveOffset: state.octaveOffset,
      };
    }

    const tag = document.getElementById("header-scale");
    if (tag) {
      tag.textContent = ALL_SCALES.find((s) => s.id === state.scaleId)?.name ??
        "";
    }
  },
);

// ─── Keyboard input ───────────────────────────────────────────────────────────
new KeyboardInput(
  grid,
  () => controls.shiftOctave(+1),
  () => controls.shiftOctave(-1),
);

// ─── DOM assembly ────────────────────────────────────────────────────────────
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = "";

// Header
const header = document.createElement("header");
header.className = "app-header";
header.innerHTML = `
  <div class="header-title">
    <span class="logo-char">𝄞</span>
    <h1>NeqSynth</h1>
    <span class="subtitle">non-equal temperament synthesizer</span>
  </div>
  <div class="header-meta">
    <span id="voice-count" class="voice-badge">0 voices</span>
    <span class="scale-tag" id="header-scale">${
  ALL_SCALES.find((s) => s.id === initialScaleId)?.name ?? ""
}</span>
  </div>`;

// Grid container
const gridWrap = document.createElement("main");
gridWrap.className = "grid-wrap";
gridWrap.appendChild(grid.el);

// Controls sidebar
const ctrlWrap = document.createElement("aside");
ctrlWrap.className = "ctrl-wrap";
ctrlWrap.appendChild(controls.el);

// Mobile toggle
const toggleBtn = document.createElement("button");
toggleBtn.className = "ctrl-toggle";
toggleBtn.innerHTML = "⚙";
toggleBtn.title = "Toggle controls";
toggleBtn.addEventListener(
  "click",
  () => ctrlWrap.classList.toggle("ctrl-wrap--open"),
);

// Splash screen
const splash = document.createElement("div");
splash.className = "splash";
splash.innerHTML = `
  <div class="splash-inner">
    <div class="splash-logo">𝄞</div>
    <h2>NeqSynth</h2>
    <p class="splash-sub">Non-equal temperament polyphonic synthesizer</p>
    <div class="splash-scales">
      ${
  ALL_SCALES.map((s) => `
        <div class="splash-scale">
          <strong>${s.name}</strong>
          <small>${s.description}</small>
        </div>`).join("")
}
    </div>
    <button class="splash-start">Click to Start</button>
  </div>`;

splash.querySelector(".splash-start")!.addEventListener("click", async () => {
  await engine.resume();
  splash.classList.add("splash--gone");
  setTimeout(() => splash.remove(), 700);
});

app.appendChild(header);
app.appendChild(toggleBtn);
app.appendChild(gridWrap);
app.appendChild(ctrlWrap);
app.appendChild(splash);

// ─── Live voice count ─────────────────────────────────────────────────────────
setInterval(() => {
  const n = engine.activeCount();
  const el = document.getElementById("voice-count");
  if (el) el.textContent = `${n} voice${n !== 1 ? "s" : ""}`;
}, 100);

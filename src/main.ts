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
      grid.setScale(
        getScale(state.scaleId),
        state.rootFreq,
        state.octaveOffset,
      );
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

const GITHUB_ICON_SVG = `<svg class="github-icon" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>`;

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
    <a class="github-link" href="https://github.com/tiborsaas/neqsynth" target="_blank" rel="noopener noreferrer" title="View on GitHub" aria-label="View on GitHub">
      ${GITHUB_ICON_SVG}
    </a>
  </div>`;

// Scale bar (top, above keyboard)
const scaleWrap = document.createElement("div");
scaleWrap.className = "scale-wrap";
scaleWrap.appendChild(controls.scaleEl);

// Grid container
const gridWrap = document.createElement("main");
gridWrap.className = "grid-wrap";
gridWrap.appendChild(grid.el);

// Arp bar (bottom, below keyboard)
const arpWrap = document.createElement("div");
arpWrap.className = "arp-wrap";
arpWrap.appendChild(controls.arpEl);

// Controls sidebar
const ctrlWrap = document.createElement("aside");
ctrlWrap.className = "ctrl-wrap";
ctrlWrap.appendChild(controls.el);

// Sidebar close button (visible only on mobile)
const ctrlClose = document.createElement("button");
ctrlClose.className = "ctrl-close";
ctrlClose.innerHTML = "✕";
ctrlClose.title = "Close controls";
ctrlWrap.appendChild(ctrlClose);

// Backdrop — dims the grid when the sidebar is open on mobile
const ctrlBackdrop = document.createElement("div");
ctrlBackdrop.className = "ctrl-backdrop";

function openSidebar() {
  ctrlWrap.classList.add("ctrl-wrap--open");
  ctrlBackdrop.classList.add("ctrl-backdrop--visible");
}
function closeSidebar() {
  ctrlWrap.classList.remove("ctrl-wrap--open");
  ctrlBackdrop.classList.remove("ctrl-backdrop--visible");
}

ctrlClose.addEventListener("click", closeSidebar);
ctrlBackdrop.addEventListener("click", closeSidebar);

// Mobile toggle
const toggleBtn = document.createElement("button");
toggleBtn.className = "ctrl-toggle";
toggleBtn.innerHTML = "⚙";
toggleBtn.title = "Toggle controls";
toggleBtn.addEventListener("click", () => {
  if (ctrlWrap.classList.contains("ctrl-wrap--open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

app.appendChild(header);
app.appendChild(toggleBtn);
app.appendChild(scaleWrap);
app.appendChild(gridWrap);
app.appendChild(arpWrap);
app.appendChild(ctrlWrap);
app.appendChild(ctrlBackdrop);

// ─── Live voice count ─────────────────────────────────────────────────────────
setInterval(() => {
  const n = engine.activeCount();
  const el = document.getElementById("voice-count");
  if (el) el.textContent = `${n} voice${n !== 1 ? "s" : ""}`;
}, 100);

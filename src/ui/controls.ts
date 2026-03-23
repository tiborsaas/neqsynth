import { ALL_SCALES } from "../tuning/scales.ts";
import type { Scale } from "../tuning/scales.ts";
import type { SynthEngine, Waveform } from "../synth/engine.ts";
import type { ArpMode } from "../synth/arpeggiator.ts";
import type { LayoutMode, SvgGrid } from "../ui/grid.ts";

export interface ControlsState {
    scaleId: string;
    layout: LayoutMode;
    rootFreq: number;
    octaveOffset: number;
    arpEnabled: boolean;
    arpBpm: number;
    arpDivision: 4 | 8 | 16;
    arpMode: ArpMode;
    arpOctaves: 1 | 2 | 3;
    arpGate: number;
}

type OnChangeCallback = (state: ControlsState) => void;

const WAVE_LABELS: Record<string, string> = {
    sine: "\u223F Sine",
    sawtooth: "\u2A3F Saw",
    square: "\u2293 Sqr",
    triangle: "\u25B3 Tri",
};

export class Controls {
    /** Sidebar panel: layout, root/octave, waveform, filter, envelope, fx, keyboard hint */
    readonly el: HTMLElement;
    /** Top bar: prominent scale selector */
    readonly scaleEl: HTMLElement;
    /** Bottom bar: arpeggiator controls */
    readonly arpEl: HTMLElement;

    private engine: SynthEngine;
    private grid: SvgGrid;
    private state: ControlsState;
    private onChange: OnChangeCallback;

    constructor(
        engine: SynthEngine,
        grid: SvgGrid,
        initialState: ControlsState,
        onChange: OnChangeCallback,
    ) {
        this.engine = engine;
        this.grid = grid;
        this.state = { ...initialState };
        this.onChange = onChange;

        this.scaleEl = document.createElement("div");
        this.scaleEl.className = "scale-bar";

        this.el = document.createElement("div");
        this.el.className = "controls";

        this.arpEl = document.createElement("div");
        this.arpEl.className = "arp-bar";

        this._buildScaleBar();
        this._buildSidebar();
        this._buildArpBar();
    }

    setGrid(grid: SvgGrid) {
        this.grid = grid;
    }

    private _emit() {
        this.onChange({ ...this.state });
    }

    // ── Scale bar (top, prominent) ───────────────────────────────────────────
    private _buildScaleBar() {
        const current = ALL_SCALES.find((s) => s.id === this.state.scaleId);

        this.scaleEl.innerHTML = `
            <div class="scale-bar-inner">
                <div class="scale-bar-btns" id="tuning-btns">
                    ${
            ALL_SCALES.map((s) => `
                        <button class="scale-btn${
                s.id === this.state.scaleId ? " active" : ""
            }"
                            data-scale="${s.id}"
                            title="${s.description}">
                            ${s.name}
                        </button>
                    `).join("")
        }
                </div>
                <div class="scale-bar-info">
                    <span class="scale-desc" id="scale-desc">${
            current?.description ?? ""
        }</span>
                    <span class="scale-frame" id="scale-frame">Frame: ${
            current?.frameLabel ?? ""
        }</span>
                </div>
            </div>
        `;

        this.scaleEl.querySelector("#tuning-btns")!.addEventListener(
            "click",
            (e) => {
                const btn = (e.target as Element).closest("[data-scale]") as
                    | HTMLElement
                    | null;
                if (!btn) return;
                const id = btn.dataset["scale"]!;
                this.state.scaleId = id;

                this.scaleEl.querySelectorAll(".scale-btn").forEach((b) =>
                    b.classList.remove("active")
                );
                btn.classList.add("active");

                const scale = ALL_SCALES.find((s) => s.id === id);
                if (scale) {
                    const descEl = this.scaleEl.querySelector("#scale-desc") as
                        | HTMLElement
                        | null;
                    const frameEl = this.scaleEl.querySelector(
                        "#scale-frame",
                    ) as HTMLElement | null;
                    if (descEl) descEl.textContent = scale.description;
                    if (frameEl) {frameEl.textContent =
                            `Frame: ${scale.frameLabel}`;}
                }
                this._emit();
            },
        );
    }

    // ── Sidebar (right panel) ────────────────────────────────────────────────
    private _buildSidebar() {
        this.el.innerHTML = `
            <div class="controls-inner">

                <!-- Layout selector -->
                <section class="ctrl-section">
                    <label class="section-title">LAYOUT</label>
                    <div class="ctrl-btn-row" id="layout-btns">
                        <button class="layout-btn${
            this.state.layout === "hex" ? " active" : ""
        }" data-layout="hex">\u2B21 Hex</button>
                        <button class="layout-btn${
            this.state.layout === "iso" ? " active" : ""
        }" data-layout="iso">\u25C7 Iso</button>
                        <button class="layout-btn${
            this.state.layout === "circle" ? " active" : ""
        }" data-layout="circle">\u25CE Circle</button>
                    </div>
                </section>

                <!-- Root & Octave -->
                <section class="ctrl-section">
                    <label class="section-title">ROOT / OCTAVE</label>
                    <div class="ctrl-row">
                        <label>Root Hz</label>
                        <input type="number" id="root-freq" value="${this.state.rootFreq}" min="20" max="880" step="0.5" class="num-input">
                    </div>
                    <div class="ctrl-row">
                        <label>Octave</label>
                        <div class="octave-nudge">
                            <button id="oct-down" title="Arrow \u2193">\u2212</button>
                            <span id="oct-display">${this._octaveLabel()}</span>
                            <button id="oct-up" title="Arrow \u2191">+</button>
                        </div>
                    </div>
                </section>

                <!-- Waveform -->
                <section class="ctrl-section">
                    <label class="section-title">WAVEFORM</label>
                    <div class="ctrl-btn-row" id="wave-btns">
                        ${
            (["sine", "sawtooth", "square", "triangle"] as Waveform[]).map((w) => `
                            <button class="wave-btn${
                this.engine.getParam("waveform") === w ? " active" : ""
            }"
                                data-wave="${w}">
                                ${WAVE_LABELS[w] ?? w}
                            </button>
                        `).join("")
        }
                    </div>
                </section>

                <!-- Filter -->
                <section class="ctrl-section">
                    <label class="section-title">FILTER</label>
                    ${
            this._slider(
                "filter-cutoff",
                "Cutoff",
                80,
                18000,
                this.engine.getParam("filterCutoff"),
                1,
                "Hz",
                true,
            )
        }
                    ${
            this._slider(
                "filter-q",
                "Res",
                0.1,
                20,
                this.engine.getParam("filterQ"),
                0.1,
            )
        }
                </section>

                <!-- Envelope -->
                <section class="ctrl-section">
                    <label class="section-title">ENVELOPE</label>
                    ${
            this._slider(
                "env-attack",
                "Attack",
                0.002,
                2.0,
                this.engine.getParam("attack"),
                0.001,
                "s",
            )
        }
                    ${
            this._slider(
                "env-decay",
                "Decay",
                0.01,
                2.0,
                this.engine.getParam("decay"),
                0.01,
                "s",
            )
        }
                    ${
            this._slider(
                "env-sustain",
                "Sustain",
                0,
                1.0,
                this.engine.getParam("sustain"),
                0.01,
            )
        }
                    ${
            this._slider(
                "env-release",
                "Release",
                0.01,
                3.0,
                this.engine.getParam("release"),
                0.01,
                "s",
            )
        }
                </section>

                <!-- FX & Output -->
                <section class="ctrl-section">
                    <label class="section-title">FX / OUTPUT</label>
                    ${
            this._slider(
                "reverb-wet",
                "Reverb",
                0,
                1,
                this.engine.getParam("reverbWet"),
                0.01,
            )
        }
                    ${
            this._slider(
                "master-vol",
                "Volume",
                0,
                1,
                this.engine.getParam("masterVolume"),
                0.01,
            )
        }
                </section>

                <!-- Keyboard hint -->
                <section class="ctrl-section">
                    <label class="section-title">KEYBOARD MAP</label>
                    <div class="key-hint">
                        <div class="key-row"><span class="key-chip">1\u2013=</span>top row (highest)</div>
                        <div class="key-row"><span class="key-chip">Q\u2013]</span>second row</div>
                        <div class="key-row"><span class="key-chip">A\u2013'</span>third row</div>
                        <div class="key-row"><span class="key-chip">Z\u2013/</span>bottom row (lowest)</div>
                        <div class="key-row"><span class="key-chip">\u2191 \u2193</span>octave shift</div>
                    </div>
                </section>

            </div>
        `;

        this._bindSidebarEvents();
    }

    // ── Arp bar (bottom, centered) ───────────────────────────────────────────
    private _buildArpBar() {
        this.arpEl.innerHTML = `
            <div class="arp-bar-inner">
                <span class="arp-bar-title">ARP</span>

                <div class="arp-field">
                    <label for="arp-enabled">On</label>
                    <input type="checkbox" id="arp-enabled" class="check-input" ${
            this.state.arpEnabled ? "checked" : ""
        }>
                </div>

                <div class="arp-field">
                    <label for="arp-bpm">BPM</label>
                    <input type="number" id="arp-bpm" class="num-input arp-num" min="20" max="400" step="1" value="${this.state.arpBpm}">
                </div>

                <div class="arp-field">
                    <label for="arp-division">Rate</label>
                    <select id="arp-division" class="select-input">
                        <option value="4" ${
            this.state.arpDivision === 4 ? "selected" : ""
        }>1/4</option>
                        <option value="8" ${
            this.state.arpDivision === 8 ? "selected" : ""
        }>1/8</option>
                        <option value="16" ${
            this.state.arpDivision === 16 ? "selected" : ""
        }>1/16</option>
                    </select>
                </div>

                <div class="arp-field">
                    <label for="arp-mode">Mode</label>
                    <select id="arp-mode" class="select-input">
                        <option value="up" ${
            this.state.arpMode === "up" ? "selected" : ""
        }>Up</option>
                        <option value="down" ${
            this.state.arpMode === "down" ? "selected" : ""
        }>Down</option>
                        <option value="updown" ${
            this.state.arpMode === "updown" ? "selected" : ""
        }>UpDown</option>
                        <option value="random" ${
            this.state.arpMode === "random" ? "selected" : ""
        }>Random</option>
                    </select>
                </div>

                <div class="arp-field">
                    <label for="arp-octaves">Oct</label>
                    <select id="arp-octaves" class="select-input">
                        <option value="1" ${
            this.state.arpOctaves === 1 ? "selected" : ""
        }>1</option>
                        <option value="2" ${
            this.state.arpOctaves === 2 ? "selected" : ""
        }>2</option>
                        <option value="3" ${
            this.state.arpOctaves === 3 ? "selected" : ""
        }>3</option>
                    </select>
                </div>

                <div class="arp-field arp-field-gate">
                    <label for="arp-gate">Gate</label>
                    <input type="range" id="arp-gate" min="0" max="1" step="0.01" value="${this.state.arpGate}">
                    <span class="slider-val" id="arp-gate-val">${
            this.state.arpGate.toFixed(2)
        }</span>
                </div>
            </div>
        `;

        this._bindArpEvents();
    }

    // ── Slider helper ────────────────────────────────────────────────────────
    private _slider(
        id: string,
        label: string,
        min: number,
        max: number,
        value: number,
        step: number,
        unit = "",
        logScale = false,
    ): string {
        const sliderMin = logScale ? Math.log(min) : min;
        const sliderMax = logScale ? Math.log(max) : max;
        const sliderVal = logScale ? Math.log(value) : value;
        return `
            <div class="ctrl-row slider-row">
                <label for="${id}">${label}</label>
                <input type="range" id="${id}"
                    min="${sliderMin}" max="${sliderMax}"
                    step="${logScale ? (sliderMax - sliderMin) / 400 : step}"
                    value="${sliderVal}"
                    data-log="${logScale}"
                    data-min="${min}" data-max="${max}" data-unit="${unit}">
                <span class="slider-val" id="${id}-val">${
            this._fmt(value, unit)
        }</span>
            </div>`;
    }

    private _fmt(v: number, unit: string): string {
        if (unit === "Hz") {
            return v >= 1000
                ? `${(v / 1000).toFixed(1)}k`
                : `${Math.round(v)}Hz`;
        }
        if (unit === "s") return `${v.toFixed(v < 0.1 ? 3 : 2)}s`;
        return v.toFixed(2);
    }

    private _octaveLabel(): string {
        const o = this.state.octaveOffset;
        return o === 0 ? "\u00B10" : o > 0 ? `+${o}` : String(o);
    }

    // ── Sidebar event bindings ───────────────────────────────────────────────
    private _bindSidebarEvents() {
        // Layout buttons
        this.el.querySelector("#layout-btns")!.addEventListener(
            "click",
            (e) => {
                const btn = (e.target as Element).closest("[data-layout]") as
                    | HTMLElement
                    | null;
                if (!btn) return;
                const mode = btn.dataset["layout"] as LayoutMode;
                this.state.layout = mode;
                this._setActiveBtn(
                    this.el,
                    "#layout-btns",
                    ".layout-btn",
                    "[data-layout]",
                    mode,
                    "data-layout",
                );
                this.grid.setLayout(mode);
            },
        );

        // Waveform buttons
        this.el.querySelector("#wave-btns")!.addEventListener("click", (e) => {
            const btn = (e.target as Element).closest("[data-wave]") as
                | HTMLElement
                | null;
            if (!btn) return;
            const w = btn.dataset["wave"] as Waveform;
            this.engine.setParam("waveform", w);
            this._setActiveBtn(
                this.el,
                "#wave-btns",
                ".wave-btn",
                "[data-wave]",
                w,
                "data-wave",
            );
        });

        // Root freq
        this.el.querySelector("#root-freq")!.addEventListener("change", (e) => {
            const v = parseFloat((e.target as HTMLInputElement).value);
            if (isNaN(v) || v < 20) return;
            this.state.rootFreq = v;
            this._emit();
        });

        // Octave
        this.el.querySelector("#oct-down")!.addEventListener(
            "click",
            () => this._shiftOctave(-1),
        );
        this.el.querySelector("#oct-up")!.addEventListener(
            "click",
            () => this._shiftOctave(+1),
        );

        // All range sliders
        const sliderMap: Record<string, (v: number) => void> = {
            "filter-cutoff": (v) => this.engine.setParam("filterCutoff", v),
            "filter-q": (v) => this.engine.setParam("filterQ", v),
            "env-attack": (v) => this.engine.setParam("attack", v),
            "env-decay": (v) => this.engine.setParam("decay", v),
            "env-sustain": (v) => this.engine.setParam("sustain", v),
            "env-release": (v) => this.engine.setParam("release", v),
            "reverb-wet": (v) => this.engine.setParam("reverbWet", v),
            "master-vol": (v) => this.engine.setParam("masterVolume", v),
        };

        for (const [id, setter] of Object.entries(sliderMap)) {
            const input = this.el.querySelector(`#${id}`) as
                | HTMLInputElement
                | null;
            const display = this.el.querySelector(`#${id}-val`) as
                | HTMLElement
                | null;
            if (!input) continue;

            input.addEventListener("input", () => {
                const isLog = input.dataset["log"] === "true";
                const unit = input.dataset["unit"] ?? "";
                const raw = parseFloat(input.value);
                const v = isLog ? Math.exp(raw) : raw;
                setter(v);
                if (display) display.textContent = this._fmt(v, unit);
            });
        }
    }

    // ── Arp bar event bindings ───────────────────────────────────────────────
    private _bindArpEvents() {
        this.arpEl.querySelector("#arp-enabled")!.addEventListener(
            "change",
            (e) => {
                this.state.arpEnabled = (e.target as HTMLInputElement).checked;
                this._emit();
            },
        );

        this.arpEl.querySelector("#arp-bpm")!.addEventListener(
            "change",
            (e) => {
                const v = parseFloat((e.target as HTMLInputElement).value);
                if (isNaN(v)) return;
                this.state.arpBpm = Math.max(20, Math.min(400, Math.round(v)));
                (e.target as HTMLInputElement).value = String(
                    this.state.arpBpm,
                );
                this._emit();
            },
        );

        this.arpEl.querySelector("#arp-division")!.addEventListener(
            "change",
            (e) => {
                const v = parseInt((e.target as HTMLSelectElement).value, 10);
                if (v === 4 || v === 8 || v === 16) {
                    this.state.arpDivision = v;
                    this._emit();
                }
            },
        );

        this.arpEl.querySelector("#arp-mode")!.addEventListener(
            "change",
            (e) => {
                const v = (e.target as HTMLSelectElement).value as ArpMode;
                if (
                    v === "up" || v === "down" || v === "updown" ||
                    v === "random"
                ) {
                    this.state.arpMode = v;
                    this._emit();
                }
            },
        );

        this.arpEl.querySelector("#arp-octaves")!.addEventListener(
            "change",
            (e) => {
                const v = parseInt((e.target as HTMLSelectElement).value, 10);
                if (v === 1 || v === 2 || v === 3) {
                    this.state.arpOctaves = v;
                    this._emit();
                }
            },
        );

        this.arpEl.querySelector("#arp-gate")!.addEventListener(
            "input",
            (e) => {
                const input = e.target as HTMLInputElement;
                const v = parseFloat(input.value);
                if (isNaN(v)) return;
                this.state.arpGate = Math.max(0, Math.min(1, v));
                const label = this.arpEl.querySelector("#arp-gate-val") as
                    | HTMLElement
                    | null;
                if (label) label.textContent = this.state.arpGate.toFixed(2);
                this._emit();
            },
        );
    }

    // ── Public API ───────────────────────────────────────────────────────────
    shiftOctave(delta: number) {
        this._shiftOctave(delta);
    }

    getState(): ControlsState {
        return { ...this.state };
    }

    updateOctaveDisplay() {
        const display = this.el.querySelector("#oct-display") as
            | HTMLElement
            | null;
        if (display) display.textContent = this._octaveLabel();
    }

    // ── Private helpers ──────────────────────────────────────────────────────
    private _shiftOctave(delta: number) {
        this.state.octaveOffset = Math.max(
            -3,
            Math.min(3, this.state.octaveOffset + delta),
        );
        const display = this.el.querySelector("#oct-display") as
            | HTMLElement
            | null;
        if (display) display.textContent = this._octaveLabel();
        this._emit();
    }

    private _setActiveBtn(
        root: HTMLElement,
        section: string,
        btnClass: string,
        attrSelector: string,
        value: string,
        attr: string,
    ) {
        const parent = root.querySelector(section);
        if (!parent) return;
        parent.querySelectorAll(btnClass).forEach((b) =>
            b.classList.remove("active")
        );
        const target = parent.querySelector(
            `${attrSelector}[${attr}="${value}"]`,
        );
        target?.classList.add("active");
    }
}

// ── Convenience: build a Scale change handler ────────────────────────────────
export function buildScaleChangeHandler(
    getScale: (id: string) => Scale,
    grid: SvgGrid,
) {
    return (state: ControlsState) => {
        const scale = getScale(state.scaleId);
        grid.setScale(scale, state.rootFreq, state.octaveOffset);
    };
}

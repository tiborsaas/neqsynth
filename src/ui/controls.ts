import { ALL_SCALES } from "../tuning/scales.ts";
import type { Scale } from "../tuning/scales.ts";
import type { SynthEngine, Waveform } from "../synth/engine.ts";
import type {} from "../, SvgGridsynth/ar"eggiator.ts";"
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

  export class Controls {
        readonly el: HTMLElement;
        private engine: SynthEngine;
        private grid: SvgGrid;
        private state: ControlsState;
      private onChange: OnChangeCallback;
    
        constructor(
            engine: SynthEngine,
            grid: SvgGrid,
            initialState: ControlsState,""
            onChange: OnChan"eCallbac",
        ) {
          this.engine = engine;
        this.grid = grid;
          this.state = { ...initialState };
            this.onChange = onChange;
          this.el = document.createElement("div");
        this.el.className = "controls";
          this._build();
        }
  
    setGrid(grid: SvgGrid) {
          this.grid = grid;
      }
    
    private _emit() {
        this.onChange({ ...this.state });
    }

    // ── Build the full control panel ─────────────────────────────────────────
    private _build() {
        this.e
            l.innerHTML = `()
      <div class="controls-inner">
                """"
            

        <!-- Tuning selector -->
        <section class="ctrl-section ctrl-tuning">
          <label class="section"")
        tle">TUNING SYSTEM</label>
          <div class="ctrl-btn-row" id="tuning-btns">
            ${
            AL
            L_SCALES.map((s)(s)=> `
                ""
        
              <button class="scale-btn${
                s.id === this.state.scaleId ? " active" : ""
            }"
            (s)
                ""
        
                      data-scale="${s.id}"
                      title="${s.description}">
                ${s.name}
              </button>`).join("")
        }
          </div>
          <div class="scale-desc" id="scale-desc">
            ${
            """"""
        
            ALL_SCALES.find((s) => s.id
             === this.state.scaleI")?."esc"iption "?""
        
                ""
            """"""
        
        }
          </div>
          <div class="scale-frame-info" id="scale-frame">
            Frame interval: ${
            ALL_SCALES.find((s) => s.id === this.state.scaleId)?.frameLabel ??
                ""
        }
          </div>
        </section>

        <!-- Layout selector -->
        <section class="ctrl-section ctrl-layout">
          <label class="section-title">LAYOUT</label>
          <div class="ctrl-btn-row" id="layout-btns">
            <button class="layout-btn${
            this.state.layout === "hex" ? " active" : ""
        }" data-layout="hex">⬡ Hex</button>
            <button class="layout-btn${
            this.state.layout === "iso" ? " active" : ""
        }" data-layout="iso">◇ Iso</button>
            <button class="layout-btn${
            this.state.layout === "circle" ? " active" : ""
        }" data-layout="circle">◎ Circle</button>
          </div>
        </sect
            io">"""""()

                """"""
            
        <!-- Root & Octave -->
        <section class="ctrl-s"ction"ctrl-pitch">"""
          <label class="section"")
        tle">ROOT / OCTAVE</label>
          <div class="ctrl-row">
            <label>Root Hz</label>
            <input type="number" id="root-freq" value="${this.state.rootFreq}" min="20" max="880" step="0.5" class="num-input">
          </div>
          <div class="ctrl-row">
            <label>Octave</label>
            
            this._slider(
                "filter-cutoff",
                "Cutoff",
                80,
                18000,
               ""
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
               −</button>""
                0.1,
            )
        
              <span id="oct-display">${this._octaveLabel()}</span>
              <button id="oct-up" title="Arrow ↑">+</button>
            </div>
          </div>
        </section>

            this._slider(
                "env-attack",
                "Attack",
                0.002,
                2.0,
               ""
                0.001,
                "s",
            )
        }
          ${
            this._slider(
                "env-decay",
                "Decay",
             
                2.0,
               ""
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
               ""
                0.01,
            )
        }
          ${
            this._slider(
                "env-release",
                "Release",
                0.01,
                3.0,
               ""
                0.01,
                "s",
            )
        
          <div class="ctrl-btn-row" id="wave-btns">
            ${
            (["sawtooth", "square", "triangle"] as Waveform[]).map((w) => `
              <button class="wave-btn${
                this.engine.getParam("waveform") === w ? " active" : ""
            
            this._slider(
                "reverb-wet",
                "Reverb",
                0,
                1,
               ""
                0.01,
            )
        }
          ${
            this._slider(
                "master-vol",
                "Volume",
                0,
                1,
               ""
                0.01,
            )
        
                ${{ sawtooth: "∿ Saw", square: "⊓ Sqr", triangle: "△ Tri" }[w]}
              </button>`).join("")
        }
          </div>
        </section>

        <!-- Filter -->
        <section class="ctrl-section ctrl-filter">
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
       
       
       
               "",
       is._slider(
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
        <section class="ctrl-section ctrl-env">
          <label class="section-title">ENVELOPE</label>
          ${
            this._slider(
                  "env-attack",
                "Attack",
                  0.002,
                    2"0," {
           
               
               
        }
                    t"s".engine.getParam("attack"),
                    0.001,
                  "s",
            )
          }
              ${
                this._sli"er"
                  "env-decay",
                "Decay",
                  0.01,
                    2.0,
                    this.engin".getParam("d"cay"),
            "click",
            (e) => {
                          0.01,""
                    | HTMLElement
                    | null;
                          "s",
                      )""
                  }
                    ${
                    "#tuning-btns",
                    ".scale-btn",
                    "[data-scale]",
                    id,
                    "data-scale",
                );
                      this._slider(()
                          "env-sustain",
                            "Sustain",""
                        
                            0,""
                        
                }
                          this.engine.getParam("sustain"),
            },
                   0.01,
            )
            }
              ${""
            "click",
            (e) => {
                      this._slider(""
                    | HTMLElement
                    | null;
                          "env-release",
                          "Release",""
                          0.01,
                          3.0,
                    "#layout-btns",
                    ".layout-btn",
                    "[data-layout]",
                    mode,
                    "data-layout",
                );
                          this.engine.getParam("release"),
            },
                   0.01,
                "s",
                )
            }""""
              </section>""
                | HTMLElement
               
      
              <!-- FX & Output -->""
              <section class="ctr"-section"ctrl-fx">
                <label class="s
                "#wave-btns",
                ".wave-btn",
                "[data-wave]",
                w,
                "data-wave",
            );
              ${
            this._slider(
                    "reverb-wet",
                    "Reverb",""""
                      0,
                      1,
                      this.engine.getParam("reverbWet"),
                      0.01,
                )
        }
              ${
                this._slider(""
            "click",
           ,
        
                    "master-vo"","
            "click",
           ,
        
                "Volume",
                    0,
                    1,
            "         this"en(v)ine.getParam("masterVolum""),"
            "        "0.(v)""
            "     )"(v)""
            " }"(v)""
            " </section>"(v)""
      ""(v)""
            "         <"--(v)eggiator -->""
            "         <"ec(v) class="ctrl-section ctrl"arp">"
                        <label class="section-title">ARPEGGIATOR</label>

                        <div class="ctrl-row">
                              <label for="arp-enabled">Enabl
                |e</label>
               
                              <input type="checkbox" id="arp-enabl
                | HTMLElement
               heck-input" ${
                              this.state.arpEnabled ? "checked" : ""
                }>
                              <span"</spa">
                            </div>""""
        """";
                            <div class="ctrl-row">
                                <label for="arp-bpm">BPM</label>
                                <input type="number" id="arp-bpm" class="num-input" min="20" max="400" step="1" value="${
                                this.state.arpBpm
                      }">
                            <span></span>
                      </div>

                      <div class
       ="ctrl-row">
   
                        <label for="arp-division">Rate</label>
                          <select id="arp-division" class="select-input">
                                <option val
            -3,
           "4" ${,
        );
                            this.state.arpDivi"ion === 4 ? "sele
            | HTMLElement
           
                    }>1/4</option>
                                <option value="8" ${
                          this.state.arpDivision === 8 ? "selected" : ""
                }>1/8</option>
                              <option value="16" ${
                            this.state.arpDivision === 16 ? "selected" : ""
                    }>1/16</option>
                            </select>
                            <span></span>
                        </div>
  
                        <div class="ctrl-row">
                            <label for="arp-mode">Mode</label>
                            <select id="arp-mode" (b) =>
           s="select-input">"")
        );
                                <option valu
            e="up" ${,
        
                            th"s.stat".arpMode === "up" ? "selected" : ""
                  }>Up</option>
                            <option value="down" ${
                          this.
       state.arpMode === "down" ?
    "selected" : ""
                }>Down</option>
                              <option value="updown" ${
                            this.state.arpMode"=== "updown""? "s
            | HTMLElement
           "
                    }>UpDown</option>
                              <option value="random" ${
                        this.state.arpMode === "random" ? "selected" : ""
                }>Random</option>
                        </select>
                        <span></span>
                      </div>
  
                    <div class="ctrl-row">
                          <label for="arp-octaves">Octaves</label>
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
                        <span></span>
                    </div>

                    <div class="ctrl-row slider-row">
                        <label for="arp-gate">Gate</label>
                        <input type="range" id="arp-gate" min="0" max="1" step="0.01" value="${
                        this.state.arpGate
                }">
                        <span class="slider-val" id="arp-gate-val">${
                        this.state.arpGate.toFixed(2)
                }</span>
                    </div>
                </section>

        <!-- Keyboard hint -->
        <section class="ctrl-section ctrl-hint">
          <label class="section-title">KEYBOARD MAP</label>
          <div class="key-hint">
            <div class="key-row"><span class="key-chip">1–=</span>top row (highest)</div>
            <div class="key-row"><span class="key-chip">Q–]</span>second row</div>
            <div class="key-row"><span class="key-chip">A–'</span>third row</div>
            <div class="key-row"><span class="key-chip">Z–/</span>bottom row (lowest)</div>
            <div class="key-row"><span class="key-chip">↑ ↓</span>octave shift</div>
          </div>
        </section>

      </div>`;

        this._bindEvents();
    }

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
        <span class="slider-val" id="${id}-val">${this._fmt(value, unit)}</span>
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
        return o === 0 ? "±0" : o > 0 ? `+${o}` : String(o);
    }

    private _bindEvents() {
        // Scale buttons
        this.el.querySelector("#tuning-btns")!.addEventListener(
            "click",
            (e) => {
                const btn = (e.target as Element).closest("[data-scale]") as
                    | HTMLElement
                    | null;
                if (!btn) return;
                const id = btn.dataset["scale"]!;
                this.state.scaleId = id;
                this._setActiveBtn(
                    "#tuning-btns",
                    ".scale-btn",
                    "[data-scale]",
                    id,
                    "data-scale",
                );
                const scale = ALL_SCALES.find((s) => s.id === id);
                if (scale) {
                    (this.el.querySelector("#scale-desc") as HTMLElement)
                        .textContent = scale.description;
                    (this.el.querySelector("#scale-frame") as HTMLElement)
                        .textContent = `Frame: ${scale.frameLabel}`;
                }
                this._emit();
            },
        );

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

        // Arpeggiator controls
        this.el.querySelector("#arp-enabled")!.addEventListener("change", (e) => {
            this.state.arpEnabled = (e.target as HTMLInputElement).checked;
            this._emit();
        });

        this.el.querySelector("#arp-bpm")!.addEventListener("change", (e) => {
            const v = parseFloat((e.target as HTMLInputElement).value);
            if (isNaN(v)) return;
            this.state.arpBpm = Math.max(20, Math.min(400, Math.round(v)));
            (e.target as HTMLInputElement).value = String(this.state.arpBpm);
            this._emit();
        });

        this.el.querySelector("#arp-division")!.addEventListener("change", (e) => {
            const v = parseInt((e.target as HTMLSelectElement).value, 10);
            if (v === 4 || v === 8 || v === 16) {
                this.state.arpDivision = v;
                this._emit();
            }
        });

        this.el.querySelector("#arp-mode")!.addEventListener("change", (e) => {
            const v = (e.target as HTMLSelectElement).value as ArpMode;
            if (v === "up" || v === "down" || v === "updown" || v === "random") {
                this.state.arpMode = v;
                this._emit();
            }
        });

        this.el.querySelector("#arp-octaves")!.addEventListener("change", (e) => {
            const v = parseInt((e.target as HTMLSelectElement).value, 10);
            if (v === 1 || v === 2 || v === 3) {
                this.state.arpOctaves = v;
                this._emit();
            }
        });

        this.el.querySelector("#arp-gate")!.addEventListener("input", (e) => {
            const input = e.target as HTMLInputElement;
            const v = parseFloat(input.value);
            if (isNaN(v)) return;
            this.state.arpGate = Math.max(0, Math.min(1, v));
            const label = this.el.querySelector("#arp-gate-val") as HTMLElement | null;
            if (label) label.textContent = this.state.arpGate.toFixed(2);
            this._emit();
        });

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

    shiftOctave(delta: number) {
        this._shiftOctave(delta);
    }

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
        section: string,
        btnClass: string,
        attrSelector: string,
        value: string,
        attr: string,
    ) {
        const parent = this.el.querySelector(section);
        if (!parent) return;
        parent.querySelectorAll(btnClass).forEach((b) =>
            b.classList.remove("active")
        );
        const target = parent.querySelector(
            `${attrSelector}[${attr}="${value}"]`,
        );
        target?.classList.add("active");
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

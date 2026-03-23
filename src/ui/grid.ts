import type { Scale } from "../tuning/scales.ts";

export type LayoutMode = "hex" | "iso" | "circle";

export interface GridCell {
    id: string; // unique voice id: "r{row}c{col}"
    freq: number;
    ratioLabel: string;
    cents: number; // cents from root (of that frame)
    frameCents: number; // full frame in cents (for color mapping)
    row: number;
    col: number;
    keyLabel: string; // keyboard key label, '' if unmapped
    isFrameNote: boolean; // true for the last note (=frame note)
}

// ─── Keyboard rows: bottom to top = low to high pitch ──────────────────────
const KEY_ROWS: string[][] = [
    ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"], // row 0
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"], // row 1
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]"], // row 2
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="], // row 3
];

export const GRID_ROWS = KEY_ROWS.length; // 4

// ─── Geometry helpers ───────────────────────────────────────────────────────
const HEX_SIZE = 44; // pointy-top hex circumradius
const ISO_W = 70; // isometric diamond half-width
const ISO_H = 38; // isometric diamond half-height
const PAD = 28; // outer padding

function hexPoints(cx: number, cy: number, r: number): string {
    return Array.from({ length: 6 }, (_, i) => {
        const a = Math.PI / 180 * (60 * i - 30); // pointy-top
        return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(" ");
}

function isoPoints(cx: number, cy: number, w: number, h: number): string {
    return `${cx},${cy - h} ${cx + w},${cy} ${cx},${cy + h} ${cx - w},${cy}`;
}

// ─── Color mapping ──────────────────────────────────────────────────────────
// Map cents position within the frame to a hue.
// We use a curated section of hue space (180°–340°) for a cool-to-warm feel.
function cellColor(
    cents: number,
    frameCents: number,
    pressed: boolean,
): string {
    const t = Math.max(0, Math.min(1, cents / frameCents));
    // hue: 195° (cyan) → 280° (violet) → 340° (pink)
    const hue = 195 + t * 145;
    const sat = pressed ? 90 : 62;
    const light = pressed ? 72 : 42;
    return `hsl(${hue.toFixed(1)},${sat}%,${light}%)`;
}

function glowColor(cents: number, frameCents: number): string {
    const t = Math.max(0, Math.min(1, cents / frameCents));
    const hue = 195 + t * 145;
    return `hsl(${hue.toFixed(1)},100%,80%)`;
}

// ─── SvgGrid class ─────────────────────────────────────────────────────────
export class SvgGrid {
    readonly el: SVGSVGElement;
    private cells: GridCell[] = [];
    private pressedIds = new Set<string>();
    private layout: LayoutMode = "hex";
    private onNoteOn: (id: string, freq: number) => void;
    private onNoteOff: (id: string) => void;
    private pointerHeld = new Map<number, string>(); // pointerId → cellId
    private scale: Scale;
    private rootFreq: number;
    private octaveOffset: number;

    constructor(
        scale: Scale,
        rootFreq: number,
        octaveOffset: number,
        onNoteOn: (id: string, freq: number) => void,
        onNoteOff: (id: string) => void,
    ) {
        this.scale = scale;
        this.rootFreq = rootFreq;
        this.octaveOffset = octaveOffset;
        this.onNoteOn = onNoteOn;
        this.onNoteOff = onNoteOff;
        this.el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.el.setAttribute("class", "synth-grid");
        this._buildCells();
        this._render();
        this._bindPointer();
    }

    // ── Build cell data array ────────────────────────────────────────────────
    private _buildCells() {
        const { scale, rootFreq, octaveOffset } = this;
        const frameCents = 1200 * Math.log2(scale.frameRatio);
        const octaveMult = Math.pow(scale.frameRatio, octaveOffset);

        this.cells = [];
        for (let row = 0; row < GRID_ROWS; row++) {
            const rowMult = Math.pow(scale.frameRatio, row) * octaveMult;
            const keyRow = KEY_ROWS[row];
            for (let col = 0; col < scale.notes.length; col++) {
                const note = scale.notes[col];
                const freq = rootFreq * note.ratio * rowMult;
                const isFrameNote = col === scale.notes.length - 1;
                this.cells.push({
                    id: `r${row}c${col}`,
                    freq,
                    ratioLabel: note.label,
                    cents: note.cents,
                    frameCents,
                    row,
                    col,
                    keyLabel: keyRow[col] ?? "",
                    isFrameNote,
                });
            }
        }
    }

    // ── Re-render the SVG (full redraw) ────────────────────────────────────
    private _render() {
        // Clear
        while (this.el.firstChild) this.el.removeChild(this.el.firstChild);

        // Add defs (filters)
        const defs = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "defs",
        );
        defs.innerHTML = `
      <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="9" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>`;
        this.el.appendChild(defs);

        switch (this.layout) {
            case "hex":
                this._renderHex();
                break;
            case "iso":
                this._renderIso();
                break;
            case "circle":
                this._renderCircle();
                break;
        }
    }

    // ── Hexagonal layout ─────────────────────────────────────────────────────
    private _renderHex() {
        const r = HEX_SIZE;
        const cols = this.scale.notes.length;
        const dx = Math.sqrt(3) * r; // horizontal step between cells
        const dy = 1.5 * r; // vertical step between rows
        const rowOffset = dx / 2 + 35;

        const totalW = PAD * 2 + cols * dx + rowOffset;
        const totalH = PAD * 2 + GRID_ROWS * dy + r;
        this.el.setAttribute("viewBox", `0 0 ${totalW} ${totalH}`);
        this.el.setAttribute("width", "100%");
        this.el.setAttribute("height", "100%");
        this.el.style.maxHeight = "100%";

        for (const cell of this.cells) {
            // Rows are ordered bottom-to-top visually (row 0 at bottom)
            const visualRow = GRID_ROWS - 1 - cell.row;
            const cx = PAD + (cell.col + 0.5) * dx +
                (visualRow % 2 === 1 ? rowOffset / 2 : 0);
            const cy = PAD + visualRow * dy + r * 0.5;
            this._drawCell(cell, hexPoints(cx, cy, r - 3), cx, cy);
        }
    }

    // ── Isometric layout ─────────────────────────────────────────────────────
    private _renderIso() {
        const w = ISO_W, h = ISO_H;
        const cols = this.scale.notes.length;
        const dx = w * 1.08;
        const dy = h * 2.2;
        const stagger = w * 0.54;

        const totalW = PAD * 2 + cols * dx + stagger;
        const totalH = PAD * 2 + GRID_ROWS * dy + h;
        this.el.setAttribute("viewBox", `0 0 ${totalW} ${totalH}`);
        this.el.setAttribute("width", "100%");
        this.el.setAttribute("height", "100%");

        for (const cell of this.cells) {
            const visualRow = GRID_ROWS - 1 - cell.row;
            const cx = PAD + (cell.col + 0.5) * dx +
                (visualRow % 2 === 1 ? stagger : 0);
            const cy = PAD + visualRow * dy + h;
            this._drawCell(cell, isoPoints(cx, cy, w - 4, h - 3), cx, cy);
        }
    }

    // ── Circular layout ──────────────────────────────────────────────────────
    private _renderCircle() {
        const cols = this.scale.notes.length;
        const minR = 90;
        const ringGap = 72;
        const totalR = minR + GRID_ROWS * ringGap + 30;
        const cx = totalR + PAD;
        const cy = totalR + PAD;
        const size = totalR * 2 + PAD * 2;

        this.el.setAttribute("viewBox", `0 0 ${size} ${size}`);
        this.el.setAttribute("width", "100%");
        this.el.setAttribute("height", "100%");

        for (const cell of this.cells) {
            const ringR = minR + cell.row * ringGap;
            const angle = (cell.col / (cols - 1)) * (2 * Math.PI) - Math.PI / 2;
            const x = cx + ringR * Math.cos(angle);
            const y = cy + ringR * Math.sin(angle);

            // Arc segment as an approximation of a cell on the ring
            const arcHalfAngle = Math.PI / cols;
            const pts = this._arcSegmentPoints(
                cx,
                cy,
                ringR,
                angle,
                arcHalfAngle,
                ringGap * 0.82,
            );
            this._drawCell(cell, pts, x, y);
        }
    }

    // Arc cell geometry (trapezoidal approximation)
    private _arcSegmentPoints(
        cx: number,
        cy: number,
        r: number,
        angle: number,
        halfArc: number,
        depth: number,
    ): string {
        const inner = r - depth / 2;
        const outer = r + depth / 2;
        const gap = 0.04;
        const a0 = angle - halfArc + gap;
        const a1 = angle + halfArc - gap;
        const pts = [
            `${cx + outer * Math.cos(a0)},${cy + outer * Math.sin(a0)}`,
            `${cx + outer * Math.cos(a1)},${cy + outer * Math.sin(a1)}`,
            `${cx + inner * Math.cos(a1)},${cy + inner * Math.sin(a1)}`,
            `${cx + inner * Math.cos(a0)},${cy + inner * Math.sin(a0)}`,
        ];
        return pts.join(" ");
    }

    // ── Draw a single cell ───────────────────────────────────────────────────
    private _drawCell(
        cell: GridCell,
        points: string,
        labelX: number,
        labelY: number,
    ) {
        const pressed = this.pressedIds.has(cell.id);
        const fill = cellColor(cell.cents, cell.frameCents, pressed);
        const glow = glowColor(cell.cents, cell.frameCents);
        const strokeColor = pressed ? glow : "#1a1a2e";
        const strokeW = pressed ? 2 : 1;
        const filter = pressed
            ? "url(#glow-strong)"
            : (cell.isFrameNote ? "url(#glow)" : "none");

        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute(
            "class",
            `cell${pressed ? " cell--pressed" : ""}${
                cell.isFrameNote ? " cell--frame" : ""
            }`,
        );
        g.setAttribute("data-id", cell.id);
        g.setAttribute("data-freq", String(cell.freq));
        g.style.cursor = "pointer";

        const poly = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "polygon",
        );
        poly.setAttribute("points", points);
        poly.setAttribute("fill", fill);
        poly.setAttribute("stroke", strokeColor);
        poly.setAttribute("stroke-width", String(strokeW));
        if (filter !== "none") poly.setAttribute("filter", filter);
        poly.style.transition = "fill 0.08s, filter 0.08s";

        const label1 = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text",
        );
        label1.setAttribute("x", String(labelX));
        label1.setAttribute("y", String(labelY - 5));
        label1.setAttribute("text-anchor", "middle");
        label1.setAttribute("dominant-baseline", "middle");
        label1.setAttribute("class", "cell-ratio");
        label1.textContent = cell.ratioLabel;

        const label2 = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text",
        );
        label2.setAttribute("x", String(labelX));
        label2.setAttribute("y", String(labelY + 10));
        label2.setAttribute("text-anchor", "middle");
        label2.setAttribute("dominant-baseline", "middle");
        label2.setAttribute("class", "cell-key");
        label2.textContent = cell.keyLabel.toUpperCase();

        g.appendChild(poly);
        g.appendChild(label1);
        g.appendChild(label2);
        this.el.appendChild(g);
    }

    // ── Pointer events ────────────────────────────────────────────────────────
    private _bindPointer() {
        this.el.addEventListener("pointerdown", (e) => {
            const cell = this._cellFromEvent(e);
            if (!cell) return;
            e.preventDefault();
            this.el.setPointerCapture(e.pointerId);
            this.pointerHeld.set(e.pointerId, cell.id);
            this._pressCell(cell.id, cell.freq);
        });

        this.el.addEventListener("pointerup", (e) => {
            const id = this.pointerHeld.get(e.pointerId);
            if (id) {
                this.pointerHeld.delete(e.pointerId);
                this._releaseCell(id);
            }
        });

        this.el.addEventListener("pointerleave", (e) => {
            const id = this.pointerHeld.get(e.pointerId);
            if (id) {
                this.pointerHeld.delete(e.pointerId);
                this._releaseCell(id);
            }
        });

        this.el.addEventListener("pointermove", (e) => {
            if (!this.pointerHeld.has(e.pointerId)) return;
            const cell = this._cellFromEvent(e);
            const prevId = this.pointerHeld.get(e.pointerId);
            if (cell && cell.id !== prevId) {
                if (prevId) this._releaseCell(prevId);
                this.pointerHeld.set(e.pointerId, cell.id);
                this._pressCell(cell.id, cell.freq);
            }
        });
    }

    private _cellFromEvent(e: PointerEvent): GridCell | null {
        const target = (e.target as Element).closest("[data-id]") as
            | SVGElement
            | null;
        if (!target) return null;
        const id = target.getAttribute("data-id");
        return this.cells.find((c) => c.id === id) ?? null;
    }

    // ── Public press/release (also called by keyboard module) ────────────────
    pressCell(id: string) {
        const cell = this.cells.find((c) => c.id === id);
        if (cell) this._pressCell(id, cell.freq);
    }

    releaseCell(id: string) {
        this._releaseCell(id);
    }

    private _pressCell(id: string, freq: number) {
        if (this.pressedIds.has(id)) return;
        this.pressedIds.add(id);
        this.onNoteOn(id, freq);
        this._updateCellVisual(id, true);
    }

    private _releaseCell(id: string) {
        if (!this.pressedIds.has(id)) return;
        this.pressedIds.delete(id);
        this.onNoteOff(id);
        this._updateCellVisual(id, false);
    }

    private _updateCellVisual(id: string, pressed: boolean) {
        const g = this.el.querySelector(`[data-id="${CSS.escape(id)}"]`) as
            | SVGGElement
            | null;
        if (!g) return;
        const cell = this.cells.find((c) => c.id === id);
        if (!cell) return;
        const poly = g.querySelector("polygon");
        if (!poly) return;
        poly.setAttribute(
            "fill",
            cellColor(cell.cents, cell.frameCents, pressed),
        );
        poly.setAttribute(
            "stroke",
            pressed ? glowColor(cell.cents, cell.frameCents) : "#1a1a2e",
        );
        poly.setAttribute("stroke-width", pressed ? "2" : "1");
        poly.setAttribute(
            "filter",
            pressed
                ? "url(#glow-strong)"
                : (cell.isFrameNote ? "url(#glow)" : "none"),
        );
        if (pressed) g.classList.add("cell--pressed");
        else g.classList.remove("cell--pressed");
    }

    // ── Public API ───────────────────────────────────────────────────────────
    setLayout(mode: LayoutMode) {
        this.layout = mode;
        this._render();
    }

    setScale(scale: Scale, rootFreq: number, octaveOffset: number) {
        this.scale = scale;
        this.rootFreq = rootFreq;
        this.octaveOffset = octaveOffset;
        // Release all held notes
        for (const id of [...this.pressedIds]) this._releaseCell(id);
        this._buildCells();
        this._render();
    }

    setOctaveOffset(offset: number) {
        this.setScale(this.scale, this.rootFreq, offset);
    }

    getCells(): GridCell[] {
        return this.cells;
    }
    getLayout(): LayoutMode {
        return this.layout;
    }
    isPressed(id: string): boolean {
        return this.pressedIds.has(id);
    }

    // Map keyboard key string → cell id (used by keyboard module)
    getCellIdForKey(key: string): GridCell | undefined {
        return this.cells.find((c) => c.keyLabel === key.toLowerCase());
    }
}

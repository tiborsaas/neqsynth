import type { SvgGrid } from "../ui/grid.ts";

// Keys that are used for notes (lowercase)
const NOTE_KEYS = new Set([
    "z",
    "x",
    "c",
    "v",
    "b",
    "n",
    "m",
    ",",
    ".",
    "/",
    "\\",
    "a",
    "s",
    "d",
    "f",
    "g",
    "h",
    "j",
    "k",
    "l",
    ";",
    "'",
    "q",
    "w",
    "e",
    "r",
    "t",
    "y",
    "u",
    "i",
    "o",
    "p",
    "[",
    "]",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "0",
    "-",
    "=",
]);

export class KeyboardInput {
    private held = new Set<string>();
    private onOctaveUp?: () => void;
    private onOctaveDown?: () => void;
    private boundKeyDown: (e: KeyboardEvent) => void;
    private boundKeyUp: (e: KeyboardEvent) => void;
    private grid: SvgGrid;

    constructor(
        grid: SvgGrid,
        onOctaveUp?: () => void,
        onOctaveDown?: () => void,
    ) {
        this.grid = grid;
        this.onOctaveUp = onOctaveUp;
        this.onOctaveDown = onOctaveDown;

        this.boundKeyDown = this._onKeyDown.bind(this);
        this.boundKeyUp = this._onKeyUp.bind(this);
        window.addEventListener("keydown", this.boundKeyDown);
        window.addEventListener("keyup", this.boundKeyUp);
        // Release all notes if window loses focus
        window.addEventListener("blur", () => this._releaseAll());
    }

    private _onKeyDown(e: KeyboardEvent) {
        if (e.repeat) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        // Don't steal keys when the user is typing in a text/number input
        const tag = (document.activeElement as HTMLElement | null)?.tagName;
        if (tag === "TEXTAREA" || tag === "SELECT") return;
        if (tag === "INPUT") {
            const inputType = (document.activeElement as HTMLInputElement).type;
            if (inputType === "text" || inputType === "number") return;
        }

        const key = e.key.toLowerCase();

        // Octave control: ArrowUp / ArrowDown
        if (e.key === "ArrowUp") {
            e.preventDefault();
            this.onOctaveUp?.();
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            this.onOctaveDown?.();
            return;
        }

        if (!NOTE_KEYS.has(key)) return;
        if (this.held.has(key)) return;
        this.held.add(key);

        const cell = this.grid.getCellIdForKey(key);
        if (cell) {
            e.preventDefault();
            this.grid.pressCell(cell.id);
        }
    }

    private _onKeyUp(e: KeyboardEvent) {
        const key = e.key.toLowerCase();
        if (!this.held.has(key)) return;
        this.held.delete(key);

        const cell = this.grid.getCellIdForKey(key);
        if (cell) {
            this.grid.releaseCell(cell.id);
        }
    }

    private _releaseAll() {
        for (const key of this.held) {
            const cell = this.grid.getCellIdForKey(key);
            if (cell) this.grid.releaseCell(cell.id);
        }
        this.held.clear();
    }

    // Update grid reference when scale/layout changes (grid may be rebuilt)
    setGrid(grid: SvgGrid) {
        this._releaseAll();
        this.grid = grid;
    }

    destroy() {
        this._releaseAll();
        window.removeEventListener("keydown", this.boundKeyDown);
        window.removeEventListener("keyup", this.boundKeyUp);
    }
}

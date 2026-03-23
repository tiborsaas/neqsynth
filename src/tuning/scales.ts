export interface ScaleNote {
    ratio: number; // frequency ratio from root
    label: string; // display label, e.g. "5/4"
    cents: number; // cents from root (0–1200 for octave-based, 0–1902 for BP)
}

export interface Scale {
    id: string;
    name: string;
    description: string;
    notes: ScaleNote[];
    frameRatio: number; // "octave" equivalent: 2, 3, φ², ~1.5...
    frameLabel: string; // human label for the frame interval
}

function centsFromRatio(ratio: number): number {
    return 1200 * Math.log2(ratio);
}

// ─── 1. Just Intonation 5-limit ─────────────────────────────────────────────
// Pure small-integer ratios. Beats eliminated for 5ths and major 3rds.
const justRatios: [number, number, string][] = [
    [1, 1, "1:1"], //   0¢
    [9, 8, "9:8"], // 204¢
    [5, 4, "5:4"], // 386¢
    [4, 3, "4:3"], // 498¢
    [3, 2, "3:2"], // 702¢
    [5, 3, "5:3"], // 884¢
    [15, 8, "15:8"], // 1088¢
    [2, 1, "2:1"], // 1200¢
];

export const justIntonation: Scale = {
    id: "just",
    name: "Just Intonation",
    description: "5-limit pure ratios — consonant fifths & thirds, no beating",
    frameRatio: 2,
    frameLabel: "octave (2:1)",
    notes: justRatios.map(([n, d, label]) => {
        const ratio = n / d;
        return { ratio, label, cents: centsFromRatio(ratio) };
    }),
};

// ─── 2. Harmonic Series 8–16 ─────────────────────────────────────────────────
// Overtone partials 8 through 16 divided by 8.
// Includes the exotic 11th (551¢) and 13th (841¢) harmonics.
const harmonicPartials = [8, 9, 10, 11, 12, 13, 14, 15, 16];

export const harmonicSeries: Scale = {
    id: "harmonic",
    name: "Harmonic Series",
    description:
        "Overtones 8–16 as ratios — includes exotic 11th & 13th harmonics",
    frameRatio: 2,
    frameLabel: "octave (2:1)",
    notes: harmonicPartials.map((p) => {
        const ratio = p / 8;
        return {
            ratio,
            label: `${p}:8`,
            cents: centsFromRatio(ratio),
        };
    }),
};

// ─── 3. Pythagorean ──────────────────────────────────────────────────────────
// Built entirely from stacked 3:2 fifths, reduced to one octave.
// Perfect fifths, but thirds are wide (~408¢ vs 386¢ in JI).
function pythagoreanNote(fifths: number): number {
    let r = Math.pow(3 / 2, fifths);
    while (r >= 2) r /= 2;
    while (r < 1) r *= 2;
    return r;
}

const pythFifths = [0, 2, 4, -1, 1, 3, 5, -2]; // F C G D A E B F#...
const pythSorted = pythFifths
    .map((f) => ({ ratio: pythagoreanNote(f), fifths: f }))
    .sort((a, b) => a.ratio - b.ratio);

function fifthsLabel(f: number): string {
    const labels: Record<number, string> = {
        "-2": "16:9",
        "-1": "4:3",
        0: "1:1",
        1: "3:2",
        2: "9:8",
        3: "27:16",
        4: "81:64",
        5: "243:128",
    };
    return labels[f] ?? String(f);
}

export const pythagorean: Scale = {
    id: "pythagorean",
    name: "Pythagorean",
    description:
        "Stacked 3:2 fifths — perfect 5ths, wide thirds (~23¢ Pythagorean comma)",
    frameRatio: 2,
    frameLabel: "octave (2:1)",
    notes: [
        ...pythSorted.map((n) => ({
            ratio: n.ratio,
            label: fifthsLabel(n.fifths),
            cents: centsFromRatio(n.ratio),
        })),
        {
            ratio: 2,
            label: "2:1",
            cents: 1200,
        },
    ],
};

// ─── 4. Bohlen-Pierce ────────────────────────────────────────────────────────
// 13 equal divisions of the TRITAVE (3:1) instead of an octave.
// Step size = 3^(1/13) ≈ 1.0878. Spans ~1902¢. No octave exists.
const bpSteps = 13;
const bpStepRatio = Math.pow(3, 1 / bpSteps);

export const bohlenPierce: Scale = {
    id: "bp",
    name: "Bohlen-Pierce",
    description:
        "13 equal divisions of the tritave (3:1) — octave doesn't exist here",
    frameRatio: 3,
    frameLabel: "tritave (3:1)",
    notes: Array.from({ length: bpSteps + 1 }, (_, i) => {
        const ratio = Math.pow(bpStepRatio, i);
        return {
            ratio,
            label: `BP${i}`,
            cents: centsFromRatio(ratio),
        };
    }),
};

// ─── 5. Golden Ratio / Fibonacci ─────────────────────────────────────────────
// Uses φ = (1+√5)/2 ≈ 1.618. The "frame" is φ² ≈ 2.618.
// Scale degrees are 7 equal divisions of φ² (so each step = φ^(2/7)).
// Secondary labels show nearest Fibonacci ratio (F(n+1)/F(n)).
const phi = (1 + Math.sqrt(5)) / 2;
const phiFrame = phi * phi; // ≈ 2.618
const goldenSteps = 9;
const goldenStepRatio = Math.pow(phiFrame, 1 / goldenSteps);

// Nearest Fibonacci ratio labels for each step
const fibLabels: string[] = [
    "1:1",
    "2:1",
    "3:2",
    "5:3",
    "8:5",
    "13:8",
    "21:13",
    "34:21",
    "55:34",
    "φ²:1",
];

export const goldenFibonacci: Scale = {
    id: "golden",
    name: "Golden / Fibonacci",
    description:
        "9 equal divisions of φ² ≈ 2.618 — aperiodic, never repeats exactly",
    frameRatio: phiFrame,
    frameLabel: "phi² (≈2.618:1)",
    notes: Array.from({ length: goldenSteps + 1 }, (_, i) => {
        const ratio = Math.pow(goldenStepRatio, i);
        return {
            ratio,
            label: fibLabels[i] ?? `φ${i}`,
            cents: centsFromRatio(ratio),
        };
    }),
};

// ─── 6. Wendy Carlos Alpha ───────────────────────────────────────────────────
// Step = 2^(78/1200) ≈ 0.78 semitones. Famous for near-perfect JI approximations
// without an octave. 9 steps shown, frame ≈ 9 × 78¢ = 702¢ ≈ 3:2 fifth.
const alphaStepCents = 78;
const alphaSteps = 9;
const alphaStepRatio = Math.pow(2, alphaStepCents / 1200);
// Frame: 9 steps ≈ 702¢ — not an octave but a near-perfect 3:2
const alphaFrame = Math.pow(alphaStepRatio, alphaSteps); // ≈ 1.5016

export const wendyCarlosAlpha: Scale = {
    id: "alpha",
    name: "Wendy Carlos Alpha",
    description: "78¢ steps — near-perfect 3:2 and 5:4 without an octave",
    frameRatio: alphaFrame,
    frameLabel: `Wendy frame (≈${alphaStepCents * alphaSteps}¢)`,
    notes: Array.from({ length: alphaSteps + 1 }, (_, i) => {
        const ratio = Math.pow(alphaStepRatio, i);
        return {
            ratio,
            label: `α${i}`,
            cents: alphaStepCents * i,
        };
    }),
};

// ─── All scales ordered for the UI ───────────────────────────────────────────
export const ALL_SCALES: Scale[] = [
    justIntonation,
    harmonicSeries,
    pythagorean,
    bohlenPierce,
    goldenFibonacci,
    wendyCarlosAlpha,
];

export function getScale(id: string): Scale {
    return ALL_SCALES.find((s) => s.id === id) ?? justIntonation;
}

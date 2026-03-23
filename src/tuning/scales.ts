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

// ─── 7. Prime Sequence Scale (Overtone Skeleton) ─────────────────────────────
// Only prime harmonics: 2, 3, 5, 7, 11, 13, 17, 19, 23.
// f_n = f_0 · p_n  →  ratio from root = p_n / 2.
// No octave, no composite harmonics — hollow, metallic timbre.
const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23];

export const primeSequence: Scale = {
    id: "prime",
    name: "Prime Sequence",
    description:
        "Only prime harmonics (2–23) — no octave, hollow & metallic overtone skeleton",
    frameRatio: 23 / 2,
    frameLabel: "prime span (23:2)",
    notes: primes.map((p) => ({
        ratio: p / 2,
        label: `${p}:2`,
        cents: centsFromRatio(p / 2),
    })),
};

// ─── 8. Quadratic "Rubber Band" Scale ────────────────────────────────────────
// f_n = f_0 · 2^(n²/k).  Steps stretch quadratically — dense low, wide high.
// k=50, 10 steps: step 1 ≈ 14¢, step 5 ≈ 600¢, step 10 = 2 octaves.
const quadK = 50;
const quadSteps = 10;

export const quadraticRubberBand: Scale = {
    id: "quadratic",
    name: "Quadratic Rubber Band",
    description:
        `2^(n²/${quadK}) spacing — clustered mud low, accelerating gaps high`,
    frameRatio: Math.pow(2, (quadSteps * quadSteps) / quadK), // 2² = 4
    frameLabel: `2^(${quadSteps}²/${quadK}) ≈ 2 octaves`,
    notes: Array.from({ length: quadSteps + 1 }, (_, n) => ({
        ratio: Math.pow(2, (n * n) / quadK),
        label: `n${n}`,
        cents: ((n * n) / quadK) * 1200,
    })),
};

// ─── 9. Riemann Zeta Zeroes ───────────────────────────────────────────────────
// Non-trivial zeros of ζ(s) lie on ½ + iγ.  Using imaginary parts γ_n as
// frequency multipliers: f_n = f_0 · γ_n  →  ratio = γ_n / γ_1.
// Pseudo-random but strictly deterministic; never resolves into a pattern.
const zetaGamma = [
    14.1347,
    21.0220,
    25.0108,
    30.4248,
    32.9350,
    37.5861,
    40.9187,
    43.3271,
    48.0052,
    49.7738,
];

export const riemannZeta: Scale = {
    id: "zeta",
    name: "Riemann Zeta Zeroes",
    description:
        "Imaginary parts of ζ(s) zeros — crystalline, deterministic, never resolves",
    frameRatio: zetaGamma[zetaGamma.length - 1] / zetaGamma[0],
    frameLabel: `γ₁₀/γ₁ (≈${
        (zetaGamma[zetaGamma.length - 1] / zetaGamma[0]).toFixed(3)
    }:1)`,
    notes: zetaGamma.map((γ, i) => ({
        ratio: γ / zetaGamma[0],
        label: `γ${i + 1}`,
        cents: centsFromRatio(γ / zetaGamma[0]),
    })),
};

// ─── 10. Stern-Brocot Tree ────────────────────────────────────────────────────
// BFS traversal of all rationals between 1:1 and 2:1.
// Each level adds mediants (m+m')/(n+n'), giving ever-increasing complexity.
// Notes are sorted by pitch; early notes are most consonant.
function sternBrocotNotes(maxDepth: number): ScaleNote[] {
    const seen = new Map<string, { n: number; d: number }>();
    seen.set("1/1", { n: 1, d: 1 });
    seen.set("2/1", { n: 2, d: 1 });

    type Entry = [number, number, number, number, number]; // ln,ld,hn,hd,depth
    const queue: Entry[] = [[1, 1, 2, 1, 0]];

    while (queue.length > 0) {
        const [ln, ld, hn, hd, depth] = queue.shift()!;
        const mn = ln + hn;
        const md = ld + hd;
        seen.set(`${mn}/${md}`, { n: mn, d: md });
        if (depth < maxDepth) {
            queue.push([ln, ld, mn, md, depth + 1]);
            queue.push([mn, md, hn, hd, depth + 1]);
        }
    }

    return Array.from(seen.values())
        .map(({ n, d }) => ({
            ratio: n / d,
            label: `${n}:${d}`,
            cents: centsFromRatio(n / d),
        }))
        .sort((a, b) => a.ratio - b.ratio);
}

export const sternBrocot: Scale = {
    id: "stern-brocot",
    name: "Stern-Brocot Tree",
    description:
        "BFS through rational fractions 1:1→2:1 — starts consonant, grows dissonant",
    frameRatio: 2,
    frameLabel: "octave (2:1)",
    notes: sternBrocotNotes(3), // depth 3 → 17 notes
};

// ─── All scales ordered for the UI ───────────────────────────────────────────
export const ALL_SCALES: Scale[] = [
    justIntonation,
    harmonicSeries,
    pythagorean,
    bohlenPierce,
    goldenFibonacci,
    wendyCarlosAlpha,
    primeSequence,
    quadraticRubberBand,
    riemannZeta,
    sternBrocot,
];

export function getScale(id: string): Scale {
    return ALL_SCALES.find((s) => s.id === id) ?? justIntonation;
}

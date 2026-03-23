# NeqSynth — Non-Equal Temperament Synthesizer

A polyphonic, browser-based synthesizer that lets you explore tuning systems beyond standard 12-tone equal temperament. Built with TypeScript and the Web Audio API, with no runtime framework dependencies.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm (bundled with Node.js)

### Install

```bash
npm install
```

### Run (development)

```bash
npm run dev
```

Open the URL printed in the terminal (typically `http://localhost:5173`).

### Build for production

```bash
npm run build
```

Output is written to `dist/`. Serve it with any static file host.

### Preview the production build locally

```bash
npm run preview
```

---

## How to Play

| Input                                                     | Action                                         |
| --------------------------------------------------------- | ---------------------------------------------- |
| **Mouse / touch**                                         | Click or tap a cell in the grid                |
| **Keyboard rows** (`z`–`/` · `a`–`'` · `q`–`]` · `1`–`=`) | Play notes mapped bottom-to-top, left-to-right |
| **ArrowUp / ArrowDown**                                   | Shift the grid up or down one octave           |

The grid layout can be switched between **Hex**, **Isometric**, and **Circle** modes from the controls panel. Each cell is color-coded cyan → violet → pink to show its position within the current tuning frame.

---

## Architecture

```
src/
├── main.ts              # Application entry point; wires all modules together
├── tuning/
│   └── scales.ts        # All scale definitions and the ScaleNote / Scale types
├── synth/
│   ├── engine.ts        # Web Audio graph: oscillators, filter, envelope, reverb
│   └── arpeggiator.ts   # Step sequencer / arpeggiator with up/down/updown/random modes
├── ui/
│   ├── grid.ts          # SVG hex/iso/circle grid renderer
│   └── controls.ts      # Parameter panel (waveform, ADSR, filter, arp settings)
└── input/
    └── keyboard.ts      # Computer keyboard → grid cell mapping
```

---

## Scale Algorithms

All scale algorithms live in [`src/tuning/scales.ts`](src/tuning/scales.ts). Every scale is described by a `Scale` object that holds:

- **`notes`** — an array of `ScaleNote` values, each carrying a frequency `ratio` from the root, a human-readable `label`, and a `cents` value.
- **`frameRatio`** — the interval at which the scale "wraps" (the analogue of an octave). This is `2` for octave-based scales, `3` for Bohlen-Pierce, and `φ²` for the Golden scale.
- **`frameLabel`** — a human-readable description of the frame interval.

The helper used everywhere is:

```ts
function centsFromRatio(ratio: number): number {
  return 1200 * Math.log2(ratio);
}
```

Cents are a logarithmic unit: 1200 cents = one octave (a frequency doubling). The formula converts any ratio into cents using a base-2 logarithm scaled to 1200.

---

### 1 · Just Intonation (5-limit)

**ID:** `just`

Just Intonation tunes every interval to a ratio of small integers. The "5-limit" designation means that the prime factors used are at most 5 (i.e., only the primes 2, 3, and 5 appear).

| Degree | Ratio | Cents |
| ------ | ----- | ----- |
| 1      | 1:1   | 0     |
| 2      | 9:8   | 204   |
| 3      | 5:4   | 386   |
| 4      | 4:3   | 498   |
| 5      | 3:2   | 702   |
| 6      | 5:3   | 884   |
| 7      | 15:8  | 1088  |
| 8      | 2:1   | 1200  |

**Key properties:**

- The major third (5:4) is at 386¢ — 14 cents narrower than the equal-tempered 400¢, eliminating audible beating in chords.
- The perfect fifth (3:2) sits at exactly 702¢ — essentially identical to equal temperament.
- The scale is not transposition-invariant: playing the same pattern starting on a different root produces slightly different interval sizes.

---

### 2 · Harmonic Series (8–16)

**ID:** `harmonic`

This scale uses the 9th through 16th harmonics of the overtone series, all divided by 8 to bring them into a single octave.

$$\text{ratio}_n = \frac{n}{8}, \quad n \in \{8, 9, 10, 11, 12, 13, 14, 15, 16\}$$

| Partial | Ratio      | Cents |
| ------- | ---------- | ----- |
| 8       | 8:8 = 1:1  | 0     |
| 9       | 9:8        | 204   |
| 10      | 10:8 = 5:4 | 386   |
| 11      | 11:8       | 551   |
| 12      | 12:8 = 3:2 | 702   |
| 13      | 13:8       | 841   |
| 14      | 14:8 = 7:4 | 969   |
| 15      | 15:8       | 1088  |
| 16      | 16:8 = 2:1 | 1200  |

**Key properties:**

- The 11th harmonic (~551¢) falls between the perfect fourth (498¢) and tritone (600¢) — an interval that has no name in Western theory.
- The 13th harmonic (~841¢) is between a minor sixth and major sixth.
- These "exotic" harmonics are physically present in most acoustic instruments but are normally tempered away. Playing them creates a bright, naturally resonant and slightly unsettling sound.

---

### 3 · Pythagorean

**ID:** `pythagorean`

Pythagorean tuning builds the scale entirely from stacked perfect fifths (3:2), then folds all ratios back into a single octave by halving until they fall in `[1, 2)`.

$$\text{ratio}(n) = \left(\frac{3}{2}\right)^n \cdot 2^k, \quad k \in \mathbb{Z} \text{ such that } 1 \le \text{ratio} < 2$$

The eight fifths used (expressed as exponent $n$) are `{-2, -1, 0, 1, 2, 3, 4, 5}`, which produce the seven diatonic notes plus one chromatic.

**Key properties:**

- Perfect fifths are exactly 702¢ — the most consonant interval after the octave.
- The major third comes out at 81/64 ≈ 408¢, which is 22¢ wider than the just 5:4 (386¢). This gap is called the **syntonic comma** and causes noticeable beating in sustained chords.
- Stacking 12 perfect fifths produces a ratio of $(3/2)^{12} / 2^7 \approx 1.01364$ instead of 1 — this discrepancy of ~24¢ is the **Pythagorean comma**, which historically prevented a closed circle of fifths.

---

### 4 · Bohlen-Pierce

**ID:** `bp`

Bohlen-Pierce replaces the octave with the **tritave** (a 3:1 ratio, ~1902¢) as its frame interval, and divides it into 13 equal steps.

$$\text{step ratio} = 3^{1/13} \approx 1.0878$$
$$\text{ratio}_n = \left(3^{1/13}\right)^n, \quad n \in \{0, 1, \ldots, 13\}$$

Each step is approximately **146.3¢** — slightly larger than an equal-tempered whole tone (200¢) but smaller than a minor third.

**Key properties:**

- The octave (2:1) does **not** appear anywhere in the scale, making it genuinely non-octave-repeating.
- The tritave (3:1) is the consonant anchor; chords built on it have a hollow, open quality.
- Step 6 (≈878¢) approximates the just 5:3 major sixth; step 10 (≈1463¢) approximates the 9:5 minor seventh — both consonances relevant to odd-harmonic spectra.
- BP is well-matched to timbres made of only **odd harmonics** (e.g., square waves, clarinets).

---

### 5 · Golden / Fibonacci

**ID:** `golden`

This scale uses the **golden ratio** $\varphi = (1 + \sqrt{5})/2 \approx 1.618$ as its foundation. The frame interval is $\varphi^2 \approx 2.618$, and the scale divides that frame into 9 equal steps.

$$\varphi = \frac{1+\sqrt{5}}{2} \approx 1.618$$
$$\text{frame} = \varphi^2 \approx 2.618$$
$$\text{step ratio} = \varphi^{2/9} \approx 1.1128$$
$$\text{ratio}_n = \varphi^{2n/9}, \quad n \in \{0, 1, \ldots, 9\}$$

Each step is labeled with its nearest **Fibonacci ratio** (e.g., 3:2, 5:3, 8:5…), since successive Fibonacci numbers converge to $\varphi$:

$$\lim_{n \to \infty} \frac{F(n+1)}{F(n)} = \varphi$$

**Key properties:**

- Because $\varphi$ is the "most irrational" number (its continued fraction expansion is all 1s), multiples of $\varphi$ never align with powers of 2. The scale is therefore **aperiodic** — it never repeats in pitch space.
- The frame (~2.618:1) sits between an octave and a twelfth; it is not a familiar harmonic interval.
- The scale creates an otherworldly, non-harmonic texture that feels perpetually "almost resolved."

---

### 6 · Wendy Carlos Alpha

**ID:** `alpha`

Wendy Carlos Alpha uses a fixed step size of **78 cents**, chosen because it produces near-perfect approximations of small just ratios without anchoring to any octave or tritave.

$$\text{step ratio} = 2^{78/1200} \approx 1.04640$$
$$\text{ratio}_n = 2^{78n/1200}, \quad n \in \{0, 1, \ldots, 9\}$$

The frame is defined pragmatically as 9 steps ≈ **702¢**, which closely approximates the just perfect fifth (3:2):

$$9 \times 78¢ = 702¢ \approx \log_2(3/2) \times 1200¢$$

| Steps | Cents | Approximates                         |
| ----- | ----- | ------------------------------------ |
| 3     | 234¢  | minor third (6:5 = 316¢) — not exact |
| 4     | 312¢  | minor third (6:5 ≈ 316¢) ✓           |
| 5     | 390¢  | major third (5:4 = 386¢) ✓           |
| 9     | 702¢  | perfect fifth (3:2 = 702¢) ✓         |

**Key properties:**

- The octave (1200¢) is **not** a whole number of steps: $1200 / 78 \approx 15.38$. The scale is non-octave-repeating.
- Despite lacking an octave, it achieves better approximations to the 5:4 major third and 3:2 perfect fifth than 12-TET does, because its step size was numerically optimized for those two intervals.
- Invented by composer and synthesist Wendy Carlos alongside the Beta (63.8¢) and Gamma (35.1¢) scales.

---

## Synthesis Engine

The synth is a two-oscillator subtractive design built entirely on the Web Audio API:

- **Oscillators** — two `OscillatorNode`s per voice, slightly detuned against each other (configurable jitter in cents) for a chorus-like thickening effect.
- **Filter** — per-voice `BiquadFilterNode` in lowpass mode; cutoff and Q are user-adjustable.
- **Amplitude envelope** — ADSR implemented with `AudioParam` linear ramps on a `GainNode`.
- **Reverb** — convolution reverb (`ConvolverNode`) with a procedurally-generated impulse response; wet/dry mix is adjustable.
- **Dynamics** — a `DynamicsCompressorNode` prevents clipping when many voices are active simultaneously (max 12 voices with voice stealing).

## Arpeggiator

The arpeggiator runs as a JavaScript timer that fires at a rate derived from BPM and note division (quarter / eighth / sixteenth). It supports four step modes:

| Mode     | Behaviour                                    |
| -------- | -------------------------------------------- |
| `up`     | Cycles held notes from lowest to highest     |
| `down`   | Cycles held notes from highest to lowest     |
| `updown` | Alternates direction at each end of the list |
| `random` | Picks a random held note each step           |

The gate parameter (0–1) controls what fraction of the step interval the note is held before it is released.

---

## Tech Stack

| Layer    | Technology                     |
| -------- | ------------------------------ |
| Language | TypeScript 5                   |
| Bundler  | Vite 8                         |
| Audio    | Web Audio API (native browser) |

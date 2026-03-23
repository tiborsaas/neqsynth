export type ArpMode = "up" | "down" | "updown" | "random";

export interface ArpSettings {
  enabled: boolean;
  bpm: number;
  division: 4 | 8 | 16;
  mode: ArpMode;
  octaves: 1 | 2 | 3;
  gate: number;
}

export const DEFAULT_ARP_SETTINGS: ArpSettings = {
  enabled: false,
  bpm: 120,
  division: 16,
  mode: "up",
  octaves: 1,
  gate: 0.85,
};

type NoteOnCallback = (id: string, freq: number) => void;
type NoteOffCallback = (id: string) => void;
type NoteOffAllCallback = () => void;

interface ArpEntry {
  sourceId: string;
  freq: number;
}

export class Arpeggiator {
  private settings: ArpSettings = { ...DEFAULT_ARP_SETTINGS };

  private readonly onNoteOn: NoteOnCallback;
  private readonly onNoteOff: NoteOffCallback;
  private readonly onNoteOffAll: NoteOffAllCallback;

  private readonly heldNotes = new Map<string, number>();
  private readonly passThroughActive = new Set<string>();

  private stepIntervalId: number | null = null;
  private gateTimeoutId: number | null = null;

  private activeArpVoiceId: string | null = null;

  private upCursor = 0;
  private downCursor = 0;
  private upDownCursor = 0;
  private upDownDir: 1 | -1 = 1;

  private stepSequenceNumber = 0;
  private gateToken = 0;

  constructor(
    noteOn: NoteOnCallback,
    noteOff: NoteOffCallback,
    noteOffAll: NoteOffAllCallback,
  ) {
    this.onNoteOn = noteOn;
    this.onNoteOff = noteOff;
    this.onNoteOffAll = noteOffAll;
  }

  update(settings: Partial<ArpSettings>) {
    const prev = this.settings;
    this.settings = this.normalizeSettings({ ...this.settings, ...settings });

    if (prev.enabled !== this.settings.enabled) {
      if (this.settings.enabled) {
        this.stopPassThroughVoices();
        this.restartArp(true);
      } else {
        this.stopArp();
        this.startPassThroughForHeld();
      }
      return;
    }

    if (!this.settings.enabled) return;

    this.restartArp(true);
  }

  noteOn(id: string, freq: number) {
    this.heldNotes.set(id, freq);

    if (!this.settings.enabled) {
      this.onNoteOn(id, freq);
      this.passThroughActive.add(id);
      return;
    }

    if (this.heldNotes.size === 1) {
      this.restartArp(true);
    }
  }

  noteOff(id: string) {
    this.heldNotes.delete(id);

    if (!this.settings.enabled) {
      if (this.passThroughActive.has(id)) {
        this.passThroughActive.delete(id);
        this.onNoteOff(id);
      }
      return;
    }

    if (this.heldNotes.size === 0) {
      this.stopArp();
    }
  }

  clear() {
    this.heldNotes.clear();
    this.stopArp();
    this.stopPassThroughVoices();
    this.onNoteOffAll();
  }

  private normalizeSettings(settings: ArpSettings): ArpSettings {
    const bpm = Number.isFinite(settings.bpm)
      ? Math.max(20, Math.min(400, settings.bpm))
      : DEFAULT_ARP_SETTINGS.bpm;

    const gate = Number.isFinite(settings.gate)
      ? Math.max(0, Math.min(1, settings.gate))
      : DEFAULT_ARP_SETTINGS.gate;

    return {
      enabled: Boolean(settings.enabled),
      bpm,
      division: settings.division,
      mode: settings.mode,
      octaves: settings.octaves,
      gate,
    };
  }

  private getStepMs(): number {
    return (60_000 / this.settings.bpm) * (4 / this.settings.division);
  }

  private buildSequence(): ArpEntry[] {
    if (this.heldNotes.size === 0) return [];

    const sortedBase = [...this.heldNotes.entries()]
      .map(([sourceId, freq]) => ({ sourceId, freq }))
      .sort((a, b) => a.freq - b.freq);

    const sequence: ArpEntry[] = [];
    for (let octave = 0; octave < this.settings.octaves; octave++) {
      const ratio = 2 ** octave;
      for (const note of sortedBase) {
        sequence.push({
          sourceId: note.sourceId,
          freq: note.freq * ratio,
        });
      }
    }

    return sequence;
  }

  private resetCursors(sequenceLength: number) {
    this.upCursor = 0;
    this.downCursor = Math.max(0, sequenceLength - 1);
    this.upDownCursor = 0;
    this.upDownDir = 1;
  }

  private nextEntry(sequence: ArpEntry[]): ArpEntry {
    const n = sequence.length;

    switch (this.settings.mode) {
      case "up": {
        const idx = this.upCursor;
        this.upCursor = (this.upCursor + 1) % n;
        return sequence[idx];
      }
      case "down": {
        const idx = this.downCursor;
        this.downCursor = (this.downCursor - 1 + n) % n;
        return sequence[idx];
      }
      case "updown": {
        if (n === 1) return sequence[0];

        const idx = this.upDownCursor;
        if (this.upDownCursor === n - 1) this.upDownDir = -1;
        else if (this.upDownCursor === 0) this.upDownDir = 1;
        this.upDownCursor += this.upDownDir;
        return sequence[idx];
      }
      case "random":
      default: {
        const idx = Math.floor(Math.random() * n);
        return sequence[idx];
      }
    }
  }

  private restartArp(triggerImmediately: boolean) {
    this.stopStepInterval();
    this.stopGateTimeout();
    this.stopActiveArpVoice();

    if (!this.settings.enabled || this.heldNotes.size === 0) return;

    const seq = this.buildSequence();
    if (seq.length === 0) return;

    this.resetCursors(seq.length);

    if (triggerImmediately) {
      this.triggerStep();
    }

    const stepMs = this.getStepMs();
    this.stepIntervalId = window.setInterval(() => {
      this.triggerStep();
    }, stepMs);
  }

  private triggerStep() {
    if (!this.settings.enabled || this.heldNotes.size === 0) {
      this.stopArp();
      return;
    }

    const sequence = this.buildSequence();
    if (sequence.length === 0) {
      this.stopArp();
      return;
    }

    this.stopGateTimeout();
    this.stopActiveArpVoice();

    const entry = this.nextEntry(sequence);
    const voiceId = `arp:${entry.sourceId}:${this.stepSequenceNumber++}`;

    this.activeArpVoiceId = voiceId;
    this.onNoteOn(voiceId, entry.freq);

    const gateMs = this.getStepMs() * this.settings.gate;
    if (gateMs <= 0) {
      this.stopActiveArpVoice();
      return;
    }

    const token = ++this.gateToken;
    this.gateTimeoutId = window.setTimeout(() => {
      if (token !== this.gateToken) return;
      this.stopActiveArpVoice();
    }, gateMs);
  }

  private stopArp() {
    this.stopStepInterval();
    this.stopGateTimeout();
    this.stopActiveArpVoice();
  }

  private stopStepInterval() {
    if (this.stepIntervalId !== null) {
      window.clearInterval(this.stepIntervalId);
      this.stepIntervalId = null;
    }
  }

  private stopGateTimeout() {
    if (this.gateTimeoutId !== null) {
      window.clearTimeout(this.gateTimeoutId);
      this.gateTimeoutId = null;
    }
    this.gateToken++;
  }

  private stopActiveArpVoice() {
    if (!this.activeArpVoiceId) return;
    const id = this.activeArpVoiceId;
    this.activeArpVoiceId = null;
    this.onNoteOff(id);
  }

  private stopPassThroughVoices() {
    if (this.passThroughActive.size === 0) return;
    for (const id of this.passThroughActive) {
      this.onNoteOff(id);
    }
    this.passThroughActive.clear();
  }

  private startPassThroughForHeld() {
    for (const [id, freq] of this.heldNotes) {
      if (this.passThroughActive.has(id)) continue;
      this.onNoteOn(id, freq);
      this.passThroughActive.add(id);
    }
  }
}

export type Waveform = "sine" | "sawtooth" | "square" | "triangle";

export interface SynthParams {
    waveform: Waveform;
    filterCutoff: number; // Hz
    filterQ: number;
    attack: number; // seconds
    decay: number; // seconds
    sustain: number; // 0-1
    release: number; // seconds
    masterVolume: number; // 0-1
    reverbWet: number; // 0-1
    detune: number; // cents max random detune per voice
}

export const DEFAULT_PARAMS: SynthParams = {
    waveform: "sine",
    filterCutoff: 3200,
    filterQ: 1.8,
    attack: 0.01,
    decay: 0.15,
    sustain: 0.65,
    release: 0.45,
    masterVolume: 0.72,
    reverbWet: 0.18,
    detune: 3,
};

interface Voice {
    id: string;
    osc: OscillatorNode;
    osc2: OscillatorNode;
    filter: BiquadFilterNode;
    ampEnv: GainNode;
    dryGain: GainNode;
    reverbSend: GainNode;
    startedAt: number;
    state: "attack" | "decay" | "sustain" | "release";
}

const MAX_VOICES = 12;

export class SynthEngine {
    readonly ctx: AudioContext;
    private params: SynthParams;
    private voices = new Map<string, Voice>();
    private masterGain: GainNode;
    private compressor: DynamicsCompressorNode;
    private reverbGain: GainNode;
    private dryGain: GainNode;
    private convolver: ConvolverNode;

    constructor(params: SynthParams = DEFAULT_PARAMS) {
        this.ctx = new AudioContext();
        this.params = { ...params };

        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -18;
        this.compressor.knee.value = 12;
        this.compressor.ratio.value = 4;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = params.masterVolume;

        this.dryGain = this.ctx.createGain();
        this.dryGain.gain.value = 1 - params.reverbWet;

        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.value = params.reverbWet;

        this.convolver = this.ctx.createConvolver();
        this._buildReverbBuffer();

        this.dryGain.connect(this.compressor);
        this.convolver.connect(this.reverbGain);
        this.reverbGain.connect(this.compressor);
        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
    }

    private _buildReverbBuffer() {
        const sampleRate = this.ctx.sampleRate;
        const duration = 2.2;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.ctx.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                const env = Math.pow(1 - i / length, 2.8);
                data[i] = (Math.random() * 2 - 1) * env;
            }
        }

        this.convolver.buffer = buffer;
    }

    async resume() {
        if (this.ctx.state === "suspended") {
            await this.ctx.resume();
        }
    }

    private _evictIfNeeded() {
        if (this.voices.size < MAX_VOICES) return;

        let oldest: Voice | null = null;
        for (const voice of this.voices.values()) {
            if (!oldest || voice.startedAt < oldest.startedAt) oldest = voice;
        }

        if (!oldest) return;

        const oldestId = [...this.voices.entries()].find(([, v]) =>
            v === oldest
        )?.[0];
        if (!oldestId) return;

        this._forceStop(oldest);
        this.voices.delete(oldestId);
    }

    private _forceStop(voice: Voice) {
        try {
            voice.ampEnv.gain.cancelScheduledValues(this.ctx.currentTime);
            voice.ampEnv.gain.setValueAtTime(0, this.ctx.currentTime);
            voice.osc.stop(this.ctx.currentTime + 0.01);
            voice.osc2.stop(this.ctx.currentTime + 0.01);
        } catch {
            // already stopped
        }
    }

    noteOn(id: string, freq: number) {
        if (this.voices.has(id)) this.noteOff(id, true);
        this._evictIfNeeded();

        if (this.ctx.state === "suspended") {
            void this.ctx.resume();
        }

        const now = this.ctx.currentTime;
        const params = this.params;

        const detuneCents = (Math.random() * 2 - 1) * params.detune;

        const osc = this.ctx.createOscillator();
        osc.type = params.waveform;
        osc.frequency.value = freq;
        osc.detune.value = detuneCents;

        const osc2 = this.ctx.createOscillator();
        osc2.type = params.waveform;
        osc2.frequency.value = freq;
        osc2.detune.value = -detuneCents * 1.4 + 6;

        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = params.filterCutoff;
        filter.Q.value = params.filterQ;

        const filterEnvPeak = Math.min(params.filterCutoff * 3.5, 18000);
        filter.frequency.setValueAtTime(filterEnvPeak, now);
        filter.frequency.exponentialRampToValueAtTime(
            params.filterCutoff,
            now + params.attack + params.decay,
        );

        const ampEnv = this.ctx.createGain();
        ampEnv.gain.setValueAtTime(0.0001, now);
        ampEnv.gain.linearRampToValueAtTime(0.75, now + params.attack);
        ampEnv.gain.linearRampToValueAtTime(
            0.75 * params.sustain,
            now + params.attack + params.decay,
        );

        const oscMix = this.ctx.createGain();
        oscMix.gain.value = 0.5;

        const dryOut = this.ctx.createGain();
        dryOut.gain.value = 1 - params.reverbWet;

        const verbSend = this.ctx.createGain();
        verbSend.gain.value = params.reverbWet;

        osc.connect(oscMix);
        osc2.connect(oscMix);
        oscMix.connect(filter);
        filter.connect(ampEnv);
        ampEnv.connect(dryOut);
        ampEnv.connect(verbSend);
        dryOut.connect(this.dryGain);
        verbSend.connect(this.convolver);

        osc.start(now);
        osc2.start(now);

        const voice: Voice = {
            id,
            osc,
            osc2,
            filter,
            ampEnv,
            dryGain: dryOut,
            reverbSend: verbSend,
            startedAt: now,
            state: "attack",
        };

        this.voices.set(id, voice);
    }

    noteOff(id: string, immediate = false) {
        const voice = this.voices.get(id);
        if (!voice) return;

        const now = this.ctx.currentTime;
        const release = immediate ? 0.01 : this.params.release;

        voice.ampEnv.gain.cancelScheduledValues(now);
        voice.ampEnv.gain.setValueAtTime(voice.ampEnv.gain.value, now);
        voice.ampEnv.gain.linearRampToValueAtTime(0.0001, now + release);
        voice.osc.stop(now + release + 0.05);
        voice.osc2.stop(now + release + 0.05);
        voice.state = "release";

        this.voices.delete(id);

        const cleanupDelay = (release + 0.15) * 1000;
        setTimeout(() => {
            try {
                voice.dryGain.disconnect();
                voice.reverbSend.disconnect();
                voice.ampEnv.disconnect();
                voice.filter.disconnect();
            } catch {
                // already disconnected
            }
        }, cleanupDelay);
    }

    noteOffAll() {
        for (const id of [...this.voices.keys()]) {
            this.noteOff(id);
        }
    }

    setParam<K extends keyof SynthParams>(key: K, value: SynthParams[K]) {
        this.params[key] = value;
        const now = this.ctx.currentTime;

        if (key === "masterVolume") {
            this.masterGain.gain.linearRampToValueAtTime(
                value as number,
                now + 0.02,
            );
        }

        if (key === "filterCutoff" || key === "filterQ") {
            for (const voice of this.voices.values()) {
                if (key === "filterCutoff") {
                    voice.filter.frequency.linearRampToValueAtTime(
                        value as number,
                        now + 0.02,
                    );
                } else {
                    voice.filter.Q.linearRampToValueAtTime(
                        value as number,
                        now + 0.02,
                    );
                }
            }
        }

        if (key === "reverbWet") {
            const wet = value as number;
            this.dryGain.gain.linearRampToValueAtTime(1 - wet, now + 0.05);
            this.reverbGain.gain.linearRampToValueAtTime(wet, now + 0.05);

            for (const voice of this.voices.values()) {
                voice.dryGain.gain.linearRampToValueAtTime(1 - wet, now + 0.05);
                voice.reverbSend.gain.linearRampToValueAtTime(wet, now + 0.05);
            }
        }
    }

    getParam<K extends keyof SynthParams>(key: K): SynthParams[K] {
        return this.params[key];
    }

    getParams(): SynthParams {
        return { ...this.params };
    }

    isActive(id: string): boolean {
        return this.voices.has(id);
    }

    activeCount(): number {
        return this.voices.size;
    }
}

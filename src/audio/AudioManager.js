export class AudioManager {
    constructor() {
        this.ctx = null;
        this.analyser = null;
        this.dataArray = null;
        this.gainNode = null;

        this.isPlaying = false;
        this.tempo = 110; // Slower start
        this.nextNoteTime = 0.0;
        this.timerID = null;
        this.lookahead = 25.0; // ms
        this.scheduleAheadTime = 0.1; // s
        this.current16thNote = 0;
    }

    init() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        // Master Gain and Limiter
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.4; // Initial volume

        // Compressor to glue it together
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
        compressor.knee.setValueAtTime(30, this.ctx.currentTime);
        compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
        compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

        this.masterGain.connect(compressor);
        compressor.connect(this.ctx.destination);

        // Analyzer for visuals
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.masterGain.connect(this.analyser);
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }

    start() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        if (this.isPlaying) return;
        this.isPlaying = true;
        this.current16thNote = 0;
        this.nextNoteTime = this.ctx.currentTime;

        this.startDrone(); // Add atmosphere
        this.scheduler();
    }

    startDrone() {
        // Deep ambient drone
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(55, this.ctx.currentTime); // Low A

        // LFO for movement
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.1;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 500;
        lfo.connect(lfoGain);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        lfoGain.connect(filter.frequency);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 2);

        osc.start();
        lfo.start();

        this.droneOsc = osc;
        this.droneLfo = lfo;
    }

    stop() {
        this.isPlaying = false;
        if (this.timerID) clearTimeout(this.timerID);
        if (this.ctx) this.ctx.suspend();

        if (this.droneOsc) this.droneOsc.stop();
        if (this.droneLfo) this.droneLfo.stop();
    }

    scheduler() {
        if (!this.isPlaying) return;

        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.current16thNote, this.nextNoteTime);
            this.nextNote();
        }

        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
    }

    nextNote() {
        const secondsPerBeat = 60.0 / this.tempo;
        this.nextNoteTime += 0.25 * secondsPerBeat;
        this.current16thNote++;
        if (this.current16thNote === 16) {
            this.current16thNote = 0;
        }
    }

    scheduleNote(beatNumber, time) {
        // Kick: 4-on-the-floor
        if (beatNumber % 4 === 0) {
            this.playKick(time);
        }

        // Snare/Clap: Backbeat
        if (beatNumber === 4 || beatNumber === 12) {
            // Softer clap
            this.playSnare(time);
        }

        // Bass: Driving 16ths
        // Pattern: X-X- X-X- X-X- X-X- (Polyrythm feel)
        const bassPattern = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
        if (bassPattern[beatNumber]) {
            // Note changes every bar?
            this.playBass(time, 110); // A2
        }

        // Hi-Hat: Offbeats
        if (beatNumber % 4 === 2) {
            this.playHiHat(time, true); // Open
        } else if (beatNumber % 2 !== 0) {
            this.playHiHat(time, false); // Closed
        }

        // Arpeggio / High synth ping
        if (beatNumber % 3 === 0) {
            this.playSynth(time, 440 + (Math.random() * 200));
        }
    }

    // --- Instruments ---

    playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.start(time);
        osc.stop(time + 0.5);
    }

    playSnare(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.frequency.setValueAtTime(200, time);
        osc.frequency.exponentialRampToValueAtTime(50, time + 0.1);

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

        osc.start(time);
        osc.stop(time + 0.15);
    }

    playBass(time, freq) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';

        // Lowpass filter for bass
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.track = true; // Not a real prop, but conceptual

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        // Env
        osc.frequency.setValueAtTime(freq, time);
        filter.frequency.setValueAtTime(freq * 3, time);
        filter.frequency.exponentialRampToValueAtTime(freq, time + 0.1);

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        osc.start(time);
        osc.stop(time + 0.2);
    }

    playHiHat(time, open) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        // Use high freq triangle as poor man's noise if buffer not available
        osc.type = 'square';

        // Bandpass to thin it out
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 8000;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.frequency.setValueAtTime(10000 + Math.random() * 1000, time);

        const duration = open ? 0.1 : 0.03;

        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.start(time);
        osc.stop(time + duration);
    }

    playSynth(time, freq) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.05, time); // Quiet background
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

        osc.start(time);
        osc.stop(time + 0.3);
    }

    // --- SFX ---

    playCrash() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(0.01, t + 1.0);

        gain.gain.setValueAtTime(1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 1.0);

        osc.start(t);
        osc.stop(t + 1.0);
    }

    playScore() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(2000, t + 0.1);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

        osc.start(t);
        osc.stop(t + 0.2);
    }

    getAverageFrequency() {
        if (!this.analyser) return 0;
        this.analyser.getByteFrequencyData(this.dataArray);

        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) { // Skip high freqs
            sum += this.dataArray[i];
        }
        return (sum / this.dataArray.length) / 255;
    }
}

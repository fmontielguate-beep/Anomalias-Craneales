
class SoundService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  setEnabled(val: boolean) {
    this.enabled = val;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playClick() {
    this.playTone(800, 'sine', 0.1, 0.05);
  }

  playTypewriter() {
    this.playTone(Math.random() * 100 + 400, 'sine', 0.05, 0.02);
  }

  playSuccess() {
    const now = this.ctx?.currentTime || 0;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.4, 0.1), i * 100);
    });
  }

  playFailure() {
    this.playTone(150, 'sawtooth', 0.3, 0.1);
    this.playTone(100, 'sawtooth', 0.5, 0.05);
  }
}

export const soundService = new SoundService();

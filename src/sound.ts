type Cue = "tap" | "build" | "rain" | "warn" | "win" | "lose";
const notes: Record<Cue, number[]> = {
  tap: [430],
  build: [330, 494, 660],
  rain: [760, 690, 570, 460, 410, 320],
  warn: [262, 218, 262],
  win: [392, 494, 587, 784],
  lose: [392, 311, 196],
};
class Sound {
  private context?: AudioContext;
  private master?: GainNode;
  private loudness = 0.35;
  private timer?: number;
  private mode: "menu" | "city" | null = null;
  private phase = 0;
  private towerTimer?: number;
  unlock() {
    if (!this.context) {
      if (!window.AudioContext) return;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.loudness;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended")
      void this.context.resume().catch(() => undefined);
  }
  volume(value: number) {
    this.loudness = value;
    if (this.master) this.master.gain.value = value;
  }
  private tone(
    frequency: number,
    offset: number,
    duration: number,
    volume: number,
    type: OscillatorType,
  ) {
    if (!this.context || !this.master || this.context.state !== "running")
      return;
    const t = this.context.currentTime + offset;
    const osc = this.context.createOscillator(),
      gain = this.context.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    osc.connect(gain);
    gain.connect(this.master);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.01);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
  cue(name: Cue) {
    notes[name].forEach((note, i) =>
      this.tone(
        note,
        i * 0.095,
        name === "rain" ? 0.3 : 0.19,
        0.15,
        name === "warn" ? "triangle" : "sine",
      ),
    );
  }
  tower(active: boolean) {
    window.clearInterval(this.towerTimer);
    if (active)
      this.towerTimer = window.setInterval(
        () => this.tone(82, 0, 1.35, 0.026, "sine"),
        1500,
      );
  }
  ambient(mode: "menu" | "city" | null) {
    if (mode === this.mode) return;
    this.mode = mode;
    window.clearInterval(this.timer);
    if (!mode) return;
    const chords = [
      [130.81, 196, 261.63],
      [110, 164.81, 220],
      [146.83, 220, 293.66],
      [123.47, 185, 246.94],
    ];
    this.timer = window.setInterval(
      () => {
        if (mode === "menu")
          chords[this.phase++ % chords.length].forEach((note, i) =>
            this.tone(note, i * 0.32, 2.1, 0.055, "sine"),
          );
        else this.tone(54 + (this.phase++ % 7), 0, 1.5, 0.038, "triangle");
      },
      mode === "menu" ? 2600 : 1700,
    );
  }
}
export const audio = new Sound();

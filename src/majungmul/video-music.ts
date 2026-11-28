/** Original instrumental patterns synthesized locally; no external recordings. */
export type VideoMusic = "bright" | "calm" | "none";
export const MUSIC_LABELS: Record<VideoMusic, string> = {
  bright: "밝은 리듬",
  calm: "차분한 멜로디",
  none: "음악 없이",
};
const SAMPLE_RATE = 24_000;

export function composeMusic(mode: Exclude<VideoMusic, "none">, seconds = 30) {
  const samples = new Float32Array(Math.ceil(SAMPLE_RATE * seconds));
  const beat = 60 / (mode === "bright" ? 104 : 80);
  const chords = [
    [48, 52, 55, 59],
    [45, 48, 52, 55],
    [41, 45, 48, 52],
    [43, 47, 50, 55],
  ];
  const addNote = (midi: number, at: number, duration: number, gain: number, bass = false) => {
    const start = Math.floor(at * SAMPLE_RATE);
    const size = Math.min(Math.ceil(duration * SAMPLE_RATE), samples.length - start);
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    for (let i = 0; i < size; i++) {
      const t = i / SAMPLE_RATE,
        phase = Math.PI * 2 * frequency * t;
      const envelope =
        Math.min(1, t / 0.012) *
        Math.exp(-t / (bass ? 0.28 : 0.7)) *
        Math.min(1, (duration - t) / 0.08);
      samples[start + i]! +=
        gain *
        envelope *
        (Math.sin(phase) +
          (bass ? 0.15 : 0.3) * Math.sin(phase * 2) * Math.exp(-t * 3) +
          0.08 * Math.sin(phase * 3) * Math.exp(-t * 6));
    }
  };
  let noiseSeed = 17;
  const drum = (at: number, kind: "kick" | "hat" | "snare", gain: number) => {
    const duration = kind === "kick" ? 0.24 : kind === "snare" ? 0.13 : 0.045;
    const start = Math.floor(at * SAMPLE_RATE),
      size = Math.min(Math.ceil(duration * SAMPLE_RATE), samples.length - start);
    let previous = 0;
    for (let i = 0; i < size; i++) {
      const t = i / SAMPLE_RATE;
      noiseSeed = (Math.imul(noiseSeed, 1664525) + 1013904223) | 0;
      const noise = noiseSeed / 2147483648;
      const signal =
        kind === "kick"
          ? Math.sin(2 * Math.PI * (48 * t + 3 * (1 - Math.exp(-t * 22))))
          : (noise - previous) * 0.5;
      previous = noise;
      samples[start + i]! += signal * gain * Math.min(1, t / 0.002) * Math.exp(-t / (duration / 5));
    }
  };
  for (let bar = 0; bar * beat * 4 < seconds - 1; bar++) {
    const chord = chords[bar % chords.length]!;
    const start = bar * beat * 4;
    chord.forEach((note, index) => addNote(note + 12, start + index * 0.018, beat * 3.6, 0.075));
    for (let step = 0; step < 8; step++) {
      const at = start + (step * beat) / 2;
      if (at >= seconds - 1) break;
      const melody = [0, 2, 1, 3, 2, 1, 3, 2][(step + (bar % 2) * 2) % 8]!;
      addNote(chord[melody]! + 24, at, beat * 1.1, mode === "bright" ? 0.095 : 0.065);
      if (step % 4 === 0) addNote(chord[0]!, at, beat * 1.6, 0.17, true);
      if (mode === "bright") {
        drum(at, "hat", step % 2 ? 0.045 : 0.025);
        if (step === 0 || step === 4) drum(at, "kick", 0.32);
        if (step === 2 || step === 6) drum(at, "snare", 0.09);
      }
    }
  }
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    samples[i]! *= Math.min(1, t / 0.35, Math.max(0, (seconds - t) / 1.4));
    peak = Math.max(peak, Math.abs(samples[i]!));
  }
  if (peak) for (let i = 0; i < samples.length; i++) samples[i]! *= 0.72 / peak;
  return { samples, sampleRate: SAMPLE_RATE };
}

/** Resume on the original button click, before image loading yields user activation. */
export function prepareVideoMusic(mode: VideoMusic, signal: AbortSignal) {
  if (mode === "none") return null;
  if (typeof AudioContext === "undefined")
    throw new Error("이 브라우저는 배경음악을 지원하지 않아요. 음악 없이 만들기를 선택해 주세요.");
  const context = new AudioContext();
  const destination = context.createMediaStreamDestination();
  const source = context.createBufferSource();
  const gain = context.createGain();
  gain.gain.value = 0.8;
  source.connect(gain).connect(destination);
  let stopped = false,
    started = false;
  const close = () => {
    if (stopped) return;
    stopped = true;
    signal.removeEventListener("abort", close);
    if (started) source.stop();
    source.disconnect();
    gain.disconnect();
    destination.stream.getTracks().forEach((track) => track.stop());
    void context.close();
  };
  signal.addEventListener("abort", close, { once: true });
  let timer: ReturnType<typeof setTimeout>;
  const ready = Promise.race([
    context.resume(),
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(
              "음악을 시작하지 못했어요. 만들기 버튼을 다시 누르거나 음악 없이 만들기를 선택해 주세요.",
            ),
          ),
        5000,
      );
    }),
  ])
    .then(() => {
      signal.throwIfAborted();
      const { samples, sampleRate } = composeMusic(mode);
      const buffer = context.createBuffer(1, samples.length, sampleRate);
      buffer.copyToChannel(samples, 0);
      source.buffer = buffer;
    })
    .finally(() => clearTimeout(timer));
  return {
    ready,
    stream: destination.stream,
    close,
    start() {
      signal.throwIfAborted();
      source.start();
      started = true;
    },
  };
}

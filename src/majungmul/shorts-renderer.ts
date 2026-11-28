import { SHORTS_SECONDS, SHORTS_SCENES, type ShortsScript } from "../lib/ai/shorts-contracts";
import { loadMediaImage, sceneMotion, videoMimeType } from "./media";
import { composeMusic, type VideoMusic } from "./video-music";

export type ShortsAsset = { image: string; ai: boolean; audio?: string; transcript?: string };
export type ShortsProject = {
  name: string;
  area: string;
  script: ShortsScript;
  assets: ShortsAsset[];
  narrated: boolean;
};
export type ShortsTiming = { start: number; end: number; speechStart: number; rate: number };

/** Real decoded speech durations determine scene boundaries. Never truncate speech. */
export function shortsTimeline(durations: number[]): ShortsTiming[] {
  if (
    durations.length !== SHORTS_SCENES ||
    durations.some((d) => !Number.isFinite(d) || d < 0 || d > 20)
  )
    throw new Error("여섯 장면의 음성 길이를 확인해 주세요.");
  const weights = durations.map((d) => Math.max(2.5, d + 0.35));
  const total = weights.reduce((sum, n) => sum + n, 0);
  let time = 0;
  return weights.map((weight, i) => {
    const start = time;
    time = i === SHORTS_SCENES - 1 ? SHORTS_SECONDS : time + (weight / total) * SHORTS_SECONDS;
    const rate = Math.max(1, durations[i]! / (time - start - 0.25));
    if (rate > 1.3)
      throw new Error(`${i + 1}번 내레이션이 길어요. 문장을 줄인 뒤 음성을 다시 만들어 주세요.`);
    return { start, end: time, speechStart: start + 0.12, rate };
  });
}

function fit(
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  width: number,
  weight = 900,
) {
  do {
    ctx.font = `${weight} ${size}px "Pretendard", "Apple SD Gothic Neo", sans-serif`;
    size--;
  } while (ctx.measureText(text).width > width && size > 20);
}
export function captionLines(ctx: CanvasRenderingContext2D, text: string, width = 610): string[] {
  const lines: string[] = [];
  let line = "";
  for (const char of text.trim()) {
    if (line && ctx.measureText(line + char).width > width) {
      lines.push(line.trim());
      line = "";
    }
    line += char;
  }
  if (line) lines.push(line.trim());
  return lines;
}

export function paintShortsFrame(
  canvas: HTMLCanvasElement,
  project: ShortsProject,
  images: HTMLImageElement[],
  timeline: ShortsTiming[],
  seconds: number,
) {
  if (canvas.width !== 720) {
    canvas.width = 720;
    canvas.height = 1280;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("영상 화면을 만들 수 없어요.");
  const index = Math.max(
    0,
    timeline.findIndex((t) => seconds < t.end),
  );
  const timing = timeline[index]!,
    scene = project.script.scenes[index]!;
  const local = Math.max(0, seconds - timing.start);
  const progress = Math.min(1, local / (timing.end - timing.start));
  ctx.fillStyle = "#090909";
  ctx.fillRect(0, 0, 720, 1280);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#b9b4ae";
  fit(ctx, project.name, 23, 610, 600);
  ctx.fillText(project.name, 360, 90);
  ctx.fillStyle = "#fff";
  fit(ctx, project.script.title, 69, 620);
  ctx.fillText(project.script.title, 360, 182);
  ctx.fillStyle = "#ff482f";
  fit(ctx, project.script.accent, 69, 620);
  ctx.fillText(project.script.accent, 360, 270);
  const drawPhoto = (i: number, p: number, alpha: number) => {
    const img = images[i]!;
    const motion = sceneMotion(i, p);
    const scale = Math.max(720 / img.width, 660 / img.height) * motion.zoom;
    const w = img.width * scale,
      h = img.height * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 340, 720, 660);
    ctx.clip();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (720 - w) * motion.x, 340 + (660 - h) * motion.y, w, h);
    ctx.restore();
  };
  if (index > 0 && local < 0.22) {
    drawPhoto(index - 1, 1, 1);
    drawPhoto(index, progress, local / 0.22);
  } else drawPhoto(index, progress, 1);
  ctx.font = '700 38px "Pretendard", "Apple SD Gothic Neo", sans-serif';
  const lines = captionLines(ctx, scene.narration);
  const height = lines.length * 50 + 24,
    y = 972 - height;
  ctx.fillStyle = "rgba(0,0,0,.9)";
  ctx.fillRect(30, y, 660, height);
  ctx.fillStyle = "#fff";
  lines.forEach((line, i) => ctx.fillText(line, 360, y + 37 + i * 50));
  ctx.fillStyle = "#ff482f";
  ctx.fillRect(0, 1000, 720 * Math.min(1, seconds / SHORTS_SECONDS), 5);
  ctx.fillStyle = "#f5f0e8";
  fit(ctx, index === 5 ? `${project.name}에서 만나요` : project.area || project.name, 31, 620, 700);
  ctx.fillText(
    index === 5 ? `${project.name}에서 만나요` : project.area || project.name,
    360,
    1100,
  );
  ctx.fillStyle = "#a9a39b";
  ctx.font = "500 18px sans-serif";
  ctx.fillText(
    [project.narrated ? "AI 내레이션" : "", project.assets[index]?.ai ? "AI 연출 이미지" : ""]
      .filter(Boolean)
      .join(" · "),
    360,
    1210,
  );
  ctx.fillText(`${String(index + 1).padStart(2, "0")} / 06`, 360, 1160);
}

async function resumeAudio(audio: AudioContext) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      audio.resume(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("음성을 시작하지 못했어요. 숏츠 생성 버튼을 다시 눌러주세요.")),
          5000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Unlock on the initial click; the same context survives asynchronous AI preparation. */
export async function prepareShortsAudio(): Promise<AudioContext> {
  if (!videoMimeType(true) || typeof AudioContext === "undefined")
    throw new Error("최신 Chrome 또는 Safari에서 영상 저장을 이용해 주세요.");
  const audio = new AudioContext();
  try {
    await resumeAudio(audio);
    return audio;
  } catch (error) {
    await audio.close().catch(() => {});
    throw error;
  }
}

export async function recordReferenceShorts(
  project: ShortsProject,
  options: {
    signal: AbortSignal;
    music: VideoMusic;
    audioContext?: AudioContext;
    onProgress: (seconds: number, canvas: HTMLCanvasElement) => void;
  },
): Promise<{ blob: Blob; extension: string }> {
  const mimeType = videoMimeType(true);
  if (!mimeType || typeof AudioContext === "undefined")
    throw new Error("최신 Chrome 또는 Safari에서 영상 저장을 이용해 주세요.");
  if (
    project.assets.length !== SHORTS_SCENES ||
    (project.narrated && project.assets.some((a) => !a.audio))
  )
    throw new Error("먼저 모든 장면의 이미지와 음성을 준비해 주세요.");
  options.signal.throwIfAborted();
  const audio = options.audioContext ?? (await prepareShortsAudio());
  let stream: MediaStream | null = null,
    source: AudioBufferSourceNode | null = null;
  try {
    await resumeAudio(audio);
    const [images, buffers] = await Promise.all([
      Promise.all(project.assets.map((a) => loadMediaImage(a.image))),
      Promise.all(
        project.assets.map(async (a) => {
          if (!project.narrated || !a.audio) return null;
          const bytes = await (await fetch(a.audio, { signal: options.signal })).arrayBuffer();
          return audio.decodeAudioData(bytes);
        }),
      ),
      document.fonts?.ready,
    ]);
    options.signal.throwIfAborted();
    const timeline = shortsTimeline(buffers.map((b) => b?.duration || 0));
    const offline = new OfflineAudioContext(1, 48000 * SHORTS_SECONDS, 48000);
    if (options.music !== "none") {
      const composed = composeMusic(options.music),
        bg = offline.createBufferSource();
      const buffer = offline.createBuffer(1, composed.samples.length, composed.sampleRate);
      buffer.copyToChannel(composed.samples, 0);
      bg.buffer = buffer;
      const gain = offline.createGain();
      gain.gain.value = project.narrated ? 0.13 : 0.6;
      bg.connect(gain).connect(offline.destination);
      bg.start(0);
    }
    buffers.forEach((buffer, i) => {
      if (!buffer) return;
      const voice = offline.createBufferSource();
      voice.buffer = buffer;
      voice.playbackRate.value = timeline[i]!.rate;
      const gain = offline.createGain();
      gain.gain.value = 0.9;
      voice.connect(gain).connect(offline.destination);
      voice.start(timeline[i]!.speechStart);
    });
    const mixed = await offline.startRendering();
    options.signal.throwIfAborted();
    if (document.hidden) throw new Error("영상이 완성될 때까지 이 화면을 열어두세요.");
    const destination = audio.createMediaStreamDestination();
    source = audio.createBufferSource();
    source.buffer = mixed;
    source.connect(destination);
    const canvas = document.createElement("canvas");
    const draw = (time: number) => {
      paintShortsFrame(canvas, project, images, timeline, Math.min(29.999, time));
      options.onProgress(time, canvas);
    };
    draw(0);
    stream = canvas.captureStream(30);
    destination.stream.getAudioTracks().forEach((track) => stream!.addTrack(track));
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 4_000_000,
      audioBitsPerSecond: 128_000,
    });
    const blob = await new Promise<Blob>((resolve, reject) => {
      const chunks: Blob[] = [];
      let finished = false,
        frame = 0,
        stopTimer = 0,
        guardTimer = 0;
      const clean = () => {
        cancelAnimationFrame(frame);
        clearTimeout(stopTimer);
        clearTimeout(guardTimer);
        options.signal.removeEventListener("abort", abort);
        document.removeEventListener("visibilitychange", visibility);
      };
      const fail = (error: Error) => {
        if (finished) return;
        finished = true;
        clean();
        if (recorder.state !== "inactive") recorder.stop();
        reject(error);
      };
      const abort = () => fail(new DOMException("영상 만들기를 취소했어요.", "AbortError"));
      const visibility = () => {
        if (document.hidden)
          fail(new Error("화면이 닫혀 녹화를 멈췄어요. 화면을 열어두고 다시 완성해 주세요."));
      };
      options.signal.addEventListener("abort", abort, { once: true });
      document.addEventListener("visibilitychange", visibility);
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onerror = () => fail(new Error("영상 저장 중 문제가 생겼어요."));
      recorder.onstop = () => {
        if (finished) return;
        finished = true;
        clean();
        const result = new Blob(chunks, { type: recorder.mimeType });
        if (result.size) resolve(result);
        else reject(new Error("영상 파일이 비어 있어요."));
      };
      try {
        recorder.start();
        source!.start();
      } catch {
        fail(new Error("영상 녹화를 시작하지 못했어요."));
        return;
      }
      const start = audio.currentTime;
      const tick = () => {
        if (finished) return;
        try {
          draw(Math.min(SHORTS_SECONDS, audio.currentTime - start));
        } catch {
          fail(new Error("영상 장면을 그리지 못했어요."));
          return;
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      stopTimer = window.setTimeout(() => {
        cancelAnimationFrame(frame);
        if (recorder.state !== "inactive") recorder.stop();
      }, SHORTS_SECONDS * 1000);
      guardTimer = window.setTimeout(() => fail(new Error("영상 저장 시간이 초과됐어요.")), 45_000);
    });
    return { blob, extension: blob.type.includes("mp4") ? "mp4" : "webm" };
  } finally {
    stream?.getTracks().forEach((t) => t.stop());
    try {
      source?.stop();
    } catch {
      /* Not started or already stopped. */
    }
    source?.disconnect();
    if (!options.audioContext) await audio.close();
  }
}

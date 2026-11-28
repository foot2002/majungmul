/** Photo-led promotion cards and a real, locally rendered 30-second video. */
import { prepareVideoMusic, type VideoMusic } from "./video-music";
export const VIDEO_SECONDS = 30;
export const SCENE_SECONDS = 6;
export type MediaPhoto = {
  id: string;
  src: string;
  caption: string;
  example: boolean;
  aiStaged?: boolean;
  clip?: string;
};
export type MediaBrief = {
  topic: string;
  name: string;
  area: string;
  hours: string;
  captions: string;
  photos: MediaPhoto[];
  menus?: string[];
  generated?: MediaPhoto[];
};
export type MediaScene = {
  photo: MediaPhoto;
  title: string;
  detail: string;
  start: number;
  end: number;
};
export type PromotionVideoKind = "ai" | "photo";

export function promotionVideoComposition(brief: MediaBrief) {
  const scenes = makeScenes(brief);
  const aiClips = scenes.filter((scene) => !!scene.photo.clip).length;
  const aiPhotos = scenes.filter((scene) => scene.photo.aiStaged && !scene.photo.clip).length;
  return {
    aiClips,
    aiPhotos,
    aiSeconds: aiClips * SCENE_SECONDS,
    photoSeconds: (scenes.length - aiClips) * SCENE_SECONDS,
  };
}

export function preparePromotionVideo(brief: MediaBrief, kind: PromotionVideoKind): MediaBrief {
  if (kind === "ai") {
    if (!promotionVideoComposition(brief).aiClips)
      throw new Error(
        "완성된 AI 동영상이 아직 0개예요. 위에서 6초 AI 장면을 먼저 완성해 주세요. 사진 영상으로 대신 만들지 않았어요.",
      );
    return brief;
  }
  return {
    ...brief,
    photos: brief.photos.map(({ clip: _clip, ...photo }) => photo),
    generated: (brief.generated || []).map(({ clip: _clip, ...photo }) => photo),
  };
}
export const MOTION_LABELS = [
  "천천히 다가가기",
  "왼쪽으로 이동",
  "오른쪽으로 이동",
  "전체 모습으로 멀어지기",
  "방문 안내와 확대",
];

export function sceneMotion(index: number, progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  const p = t * t * (3 - 2 * t);
  return [
    { zoom: 1 + p * 0.28, x: 0.5, y: 0.5 },
    { zoom: 1.25, x: 1 - p, y: 0.35 },
    { zoom: 1.25, x: p, y: 0.6 },
    { zoom: 1.3 - p * 0.28, x: 0.5, y: 0.5 },
    { zoom: 1.06 + p * 0.18, x: 0.3 + p * 0.4, y: 0.5 },
  ][index % 5]!;
}

export function makeScenes(brief: MediaBrief): MediaScene[] {
  if (!brief.photos.length) return [];
  const captions = brief.captions
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const titles = [brief.topic, captions[0], captions[1], captions[2], `${brief.name}에서 만나요`];
  return titles.map((title, i) => {
    const added = i > 0 && i < 4 ? brief.generated?.[i - 1] : undefined;
    const photo = added || brief.photos[i % brief.photos.length]!;
    return {
      photo,
      title: added?.caption || title || photo.caption || brief.topic,
      detail: i === 4 ? [brief.area, brief.hours].filter(Boolean).join(" · ") : brief.name,
      start: i * SCENE_SECONDS,
      end: (i + 1) * SCENE_SECONDS,
    };
  });
}

export function videoMimeType(withAudio = true): string | null {
  if (
    typeof MediaRecorder === "undefined" ||
    typeof HTMLCanvasElement.prototype.captureStream !== "function"
  )
    return null;
  return (
    (withAudio
      ? [
          "video/mp4;codecs=avc1.42001f,mp4a.40.2",
          "video/mp4",
          "video/webm;codecs=vp8,opus",
          "video/webm",
        ]
      : ["video/mp4;codecs=avc1.42001f", "video/mp4", "video/webm;codecs=vp8", "video/webm"]
    ).find((type) => MediaRecorder.isTypeSupported(type)) || null
  );
}

export function loadMediaImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = window.setTimeout(() => {
      img.src = "";
      reject(new Error("사진을 불러오는 데 시간이 걸려요. 다시 시도해 주세요."));
    }, 15000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error("사진을 불러오지 못했어요. 다른 사진을 골라주세요."));
    };
    img.src = src;
  });
}

function cover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | HTMLVideoElement,
  width: number,
  height: number,
  zoom = 1,
  x = 0.5,
  y = 0.5,
) {
  const iw = "videoWidth" in image ? image.videoWidth : image.width;
  const ih = "videoHeight" in image ? image.videoHeight : image.height;
  const scale = Math.max(width / iw, height / ih) * zoom;
  const w = iw * scale,
    h = ih * scale;
  ctx.drawImage(image, (width - w) * x, (height - h) * y, w, h);
}

function textLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const char of text.replace(/\s+/g, " ").trim()) {
    if (line && ctx.measureText(line + char).width > maxWidth) {
      lines.push(line.trim());
      line = "";
    }
    line += char;
  }
  if (line) lines.push(line.trim());
  if (lines.length <= maxLines) return lines;
  const clipped = lines.slice(0, maxLines);
  let last = clipped[maxLines - 1]!;
  while (last && ctx.measureText(last + "…").width > maxWidth) last = last.slice(0, -1);
  clipped[maxLines - 1] = last + "…";
  return clipped;
}

function typography(
  ctx: CanvasRenderingContext2D,
  title: string,
  detail: string,
  name: string,
  example: boolean,
  entrance = 1,
  aiStaged = false,
) {
  const { width: w, height: h } = ctx.canvas;
  const pad = w * 0.085;
  const gradient = ctx.createLinearGradient(0, h * 0.34, 0, h);
  gradient.addColorStop(0, "rgba(17,26,22,0)");
  gradient.addColorStop(0.6, "rgba(17,26,22,0.66)");
  gradient.addColorStop(1, "rgba(17,26,22,0.94)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  const top = ctx.createLinearGradient(0, 0, 0, h * 0.23);
  top.addColorStop(0, "rgba(17,26,22,0.55)");
  top.addColorStop(1, "rgba(17,26,22,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, h * 0.23);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.font = `600 ${w * 0.03}px "Noto Sans KR", sans-serif`;
  ctx.fillText(textLines(ctx, name, w - pad * 2, 1)[0] || "", pad, h * 0.065);
  if (example || aiStaged) {
    ctx.font = `500 ${w * 0.021}px "Noto Sans KR", sans-serif`;
    ctx.fillText(
      aiStaged
        ? example
          ? "AI 연출 · 예시 매장"
          : "AI 연출 장면"
        : "AI 예시 이미지 · 실제 매장 아님",
      pad,
      h * 0.1,
    );
  }
  ctx.fillStyle = "#EAC48A";
  ctx.save();
  ctx.globalAlpha *= entrance;
  ctx.translate(0, (1 - entrance) * h * 0.045);
  ctx.fillRect(pad, h * 0.66, w * 0.09, 4);
  ctx.fillStyle = "#fff";
  ctx.font = `800 ${w * 0.071}px "Noto Sans KR", sans-serif`;
  textLines(ctx, title, w - pad * 2, h / w > 1.5 ? 3 : 2).forEach((line, i) =>
    ctx.fillText(line, pad, h * 0.69 + i * w * 0.098),
  );
  ctx.fillStyle = "#F3EBDC";
  ctx.font = `400 ${w * 0.029}px "Noto Sans KR", sans-serif`;
  textLines(ctx, detail, w - pad * 2, 2).forEach((line, i) =>
    ctx.fillText(line, pad, h * 0.9 + i * w * 0.042),
  );
  ctx.restore();
}

export async function paintCard(
  canvas: HTMLCanvasElement,
  brief: MediaBrief,
  index: number,
): Promise<void> {
  const photo = brief.photos[index];
  if (!photo) throw new Error("홍보에 사용할 사진을 먼저 골라주세요.");
  const [image] = await Promise.all([loadMediaImage(photo.src), document.fonts?.ready]);
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이 브라우저에서 이미지를 만들 수 없어요.");
  cover(ctx, image, canvas.width, canvas.height);
  typography(
    ctx,
    index === 0 ? brief.topic : photo.caption,
    brief.area,
    brief.name,
    photo.example,
    1,
    photo.aiStaged,
  );
}

export function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("이미지를 저장하지 못했어요."))),
      "image/png",
    ),
  );
}

export function downloadMedia(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
}

export function loadMediaClip(src: string, signal: AbortSignal): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      video.onloadeddata = null;
      video.onerror = null;
    };
    const fail = (error: Error) => {
      cleanup();
      video.removeAttribute("src");
      video.load();
      reject(error);
    };
    const abort = () => fail(new DOMException("영상 만들기를 취소했어요.", "AbortError"));
    const timer = setTimeout(
      () => fail(new Error("AI 영상을 불러오지 못했어요. 연결을 확인하고 다시 만들어 주세요.")),
      45_000,
    );
    signal.addEventListener("abort", abort, { once: true });
    video.onloadeddata = () => {
      if (!Number.isFinite(video.duration) || video.duration < 5.8 || !video.videoWidth) {
        fail(new Error("AI 영상이 6초보다 짧거나 올바르지 않아요."));
        return;
      }
      cleanup();
      resolve(video);
    };
    video.onerror = () =>
      fail(new Error("AI 영상 파일을 읽지 못했어요. 영상 상태를 다시 확인해 주세요."));
    if (signal.aborted) {
      abort();
      return;
    }
    video.src = src;
    video.load();
  });
}

export async function recordVideo(
  brief: MediaBrief,
  options: {
    signal: AbortSignal;
    onProgress: (seconds: number, canvas: HTMLCanvasElement) => void;
    music?: VideoMusic;
  },
): Promise<{ blob: Blob; extension: string }> {
  const musicMode = options.music ?? "bright";
  const mimeType = videoMimeType(musicMode !== "none");
  if (!mimeType)
    throw new Error(
      "이 브라우저는 영상 저장을 지원하지 않아요. 최신 Chrome 또는 Safari에서 열어주세요.",
    );
  const scenes = makeScenes(brief);
  if (!scenes.length) throw new Error("영상에 사용할 사진을 먼저 골라주세요.");
  options.signal.throwIfAborted();
  const music = prepareVideoMusic(musicMode, options.signal);
  let stream: MediaStream | null = null;
  const clips = new Map<number, HTMLVideoElement>();
  const preparation = new AbortController();
  try {
    const [loadedImages] = await Promise.all([
      Promise.all(
        [...brief.photos, ...(brief.generated || [])].map(
          async (p) => [p.id, await loadMediaImage(p.src)] as const,
        ),
      ),
      music?.ready,
      Promise.all(
        scenes.map(async (scene, i) => {
          if (!scene.photo.clip) return;
          const clip = await loadMediaClip(
            scene.photo.clip,
            AbortSignal.any([options.signal, preparation.signal]),
          );
          clips.set(i, clip);
        }),
      ),
    ]);
    const images = new Map(loadedImages);
    await document.fonts?.ready;
    options.signal.throwIfAborted();
    if (document.hidden) throw new Error("영상이 완성될 때까지 이 화면을 열어두세요.");
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1280;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("영상 화면을 만들지 못했어요.");
    const drawScene = (scene: MediaScene, index: number, progress: number, alpha = 1) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      const motion = sceneMotion(index, progress);
      const clip = clips.get(index);
      cover(
        ctx,
        clip || images.get(scene.photo.id)!,
        720,
        1280,
        clip ? 1 : motion.zoom,
        clip ? 0.5 : motion.x,
        clip ? 0.5 : motion.y,
      );
      const entrance = Math.min(1, Math.max(0, progress * SCENE_SECONDS) / 0.6);
      typography(
        ctx,
        scene.title,
        scene.detail,
        brief.name,
        scene.photo.example,
        1 - (1 - entrance) ** 3,
        scene.photo.aiStaged,
      );
      ctx.restore();
    };
    let playingIndex = -1,
      playbackError = false;
    const draw = (seconds: number) => {
      if (playbackError) throw new Error("AI 영상 재생을 시작하지 못했어요.");
      const index = Math.min(4, Math.floor(seconds / SCENE_SECONDS));
      const local = seconds - index * SCENE_SECONDS;
      const scene = scenes[index]!;
      if (playingIndex !== index) {
        playingIndex = index;
        const clip = clips.get(index);
        if (clip) {
          clip.currentTime = 0;
          void clip.play().catch(() => {
            playbackError = true;
          });
        }
      }
      clips.forEach((clip, i) => {
        if (i < index && (i < index - 1 || local >= 0.65)) clip.pause();
      });
      ctx.clearRect(0, 0, 720, 1280);
      if (index > 0 && local < 0.65) {
        drawScene(scenes[index - 1]!, index - 1, 1);
        drawScene(scene, index, local / SCENE_SECONDS, local / 0.65);
      } else drawScene(scene, index, local / SCENE_SECONDS);
      options.onProgress(seconds, canvas);
    };
    draw(0);
    stream = canvas.captureStream(30);
    music?.stream.getAudioTracks().forEach((track) => stream!.addTrack(track));
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 4_000_000,
      audioBitsPerSecond: 128_000,
    });
    const blob = await new Promise<Blob>((resolve, reject) => {
      const chunks: Blob[] = [];
      let frame = 0,
        stopTimer = 0,
        guardTimer = 0,
        finished = false;
      const clean = () => {
        cancelAnimationFrame(frame);
        clearTimeout(stopTimer);
        clearTimeout(guardTimer);
        document.removeEventListener("visibilitychange", visibility);
        options.signal.removeEventListener("abort", abort);
      };
      const fail = (error: Error | DOMException) => {
        if (finished) return;
        finished = true;
        clean();
        if (recorder.state !== "inactive") recorder.stop();
        reject(error);
      };
      const abort = () => fail(new DOMException("영상 만들기를 취소했어요.", "AbortError"));
      const visibility = () => {
        if (document.hidden)
          fail(
            new Error("화면이 닫혀 영상 만들기를 멈췄어요. 화면을 열어두고 다시 만들어 주세요."),
          );
      };
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => fail(new Error("영상 저장 중 문제가 생겼어요. 다시 만들어 주세요."));
      recorder.onstop = () => {
        if (finished) return;
        finished = true;
        clean();
        const result = new Blob(chunks, { type: recorder.mimeType || mimeType });
        if (result.size) resolve(result);
        else reject(new Error("영상 파일이 비어 있어요. 다시 만들어 주세요."));
      };
      document.addEventListener("visibilitychange", visibility);
      options.signal.addEventListener("abort", abort, { once: true });
      try {
        recorder.start();
        music?.start();
      } catch {
        fail(new Error("영상 녹화를 시작하지 못했어요. 다른 브라우저에서 시도해 주세요."));
        return;
      }
      const start = performance.now();
      const tick = () => {
        if (finished || recorder.state === "inactive") return;
        try {
          draw(Math.min((performance.now() - start) / 1000, VIDEO_SECONDS - 0.001));
        } catch {
          fail(new Error("영상 장면을 만들지 못했어요. 다시 시도해 주세요."));
          return;
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      stopTimer = window.setTimeout(() => {
        cancelAnimationFrame(frame);
        if (recorder.state !== "inactive") recorder.stop();
      }, VIDEO_SECONDS * 1000);
      guardTimer = window.setTimeout(
        () => fail(new Error("영상 저장 시간이 초과됐어요. 다시 시도해 주세요.")),
        (VIDEO_SECONDS + 15) * 1000,
      );
    });
    return { blob, extension: blob.type.includes("mp4") ? "mp4" : "webm" };
  } finally {
    preparation.abort();
    stream?.getTracks().forEach((track) => track.stop());
    clips.forEach((clip) => {
      clip.pause();
      clip.removeAttribute("src");
      clip.load();
    });
    music?.close();
  }
}

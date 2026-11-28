import { createAiSample, getAiConfiguration, resolveAiProvider } from "../lib/ai/client";
import { PROVIDER_LABELS, type AiProvider, type AiStatus } from "../lib/ai/contracts";
import {
  getShortsConfiguration,
  requestShortsImage,
  requestShortsSpeech,
} from "../lib/ai/shorts-functions";
import {
  shortsScriptPrompt,
  shortsScriptSchema,
  SHORTS_SCRIPT_STYLES,
  type ShortsScriptStyle,
  type ShortsConfiguration,
  type ShortsScript,
  type ShortsVoice,
} from "../lib/ai/shorts-contracts";
import { loadMediaImage, videoMimeType, type MediaBrief } from "./media";
import { MUSIC_LABELS, type VideoMusic } from "./video-music";
import {
  paintShortsFrame,
  prepareShortsAudio,
  recordReferenceShorts,
  shortsTimeline,
  type ShortsAsset,
} from "./shorts-renderer";

const esc = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const AI_SLOTS = [1, 2, 4];
let brief: MediaBrief | null = null,
  key = "",
  version = 0;
let script: ShortsScript | null = null;
let assets: (ShortsAsset | null)[] = [];
let provider: AiProvider | "off" = "off",
  voice: ShortsVoice = "marin",
  music: VideoMusic = "bright";
let useAiImages = true,
  narrated = true;
let scriptStyle: ShortsScriptStyle = "menu",
  editorOpen = false;
let status: AiStatus | null = null,
  config: ShortsConfiguration | null = null,
  configLoading = false,
  configError = "";
let job: AbortController | null = null,
  stage = "",
  error = "",
  previewIndex = 0;
let result: { url: string; extension: string } | null = null;

function clearResult() {
  if (result) URL.revokeObjectURL(result.url);
  result = null;
}
export function clearShortsStudio() {
  version++;
  job?.abort();
  job = null;
  clearResult();
  script = null;
  assets = [];
  brief = null;
  key = "";
  error = "";
  stage = "";
  editorOpen = false;
}
function ready() {
  return (
    shortsScriptSchema.safeParse(script).success &&
    assets.length === 6 &&
    assets.every((a) => a?.image && (!narrated || a.audio))
  );
}
function invalidateImage(i: number) {
  const old = assets[i];
  assets[i] = old ? { ...old, image: "", ai: false } : null;
}
const facts = (b: MediaBrief) => ({
  name: b.name,
  area: b.area,
  hours: b.hours,
  topic: b.topic,
  menus: b.menus || [],
});
function original(i: number) {
  return brief!.photos[Math.min(script!.scenes[i]!.photoIndex, brief!.photos.length - 1)]!;
}
function project() {
  return {
    name: brief!.name,
    area: brief!.area,
    script: script!,
    narrated,
    assets: script!.scenes.map((_, i) => ({
      ai: false,
      ...assets[i],
      image: assets[i]?.image || original(i).src,
    })),
  };
}

export function shortsStudioHtml(next: MediaBrief) {
  const nextKey = JSON.stringify({
    name: next.name,
    area: next.area,
    hours: next.hours,
    topic: next.topic,
    menus: next.menus,
    photos: next.photos,
  });
  if (key !== nextKey) {
    clearShortsStudio();
    key = nextKey;
    brief = next;
  }
  if (!next.photos.length) return "";
  const busy = !!job,
    selected = status?.providers.find((p) => p.id === provider);
  return `<section class="shorts-studio stack" aria-labelledby="shortsTitle">
    <div class="row between"><div><span class="media-eyebrow">이미지 + 내레이션 + 자막</span><h2 id="shortsTitle">30초 내레이션 숏츠</h2></div><span class="chip ink">9:16 · 30초</span></div>
    <p class="small muted">원하는 옵션을 고르고 한 번만 누르세요. 가게 사진과 정보로 대본·이미지·내레이션부터 30초 영상까지 자동으로 만들어요.</p>
    <div class="shorts-options">
      <div class="stack"><span class="lbl">대본을 만들 AI</span><div class="row">${["openai", "anthropic"].map((id) => `<button class="btn sm ${provider === id ? "primary" : ""}" data-act="shortsProvider" data-v="${id}" aria-pressed="${provider === id}" ${busy || !status?.providers.some((p) => p.id === id && p.configured) ? "disabled" : ""}>${PROVIDER_LABELS[id as AiProvider]}</button>`).join("")}</div></div>
      <div class="stack"><span class="lbl">장면 이미지</span><div class="row"><button class="btn sm ${useAiImages ? "primary" : ""}" data-act="shortsImages" data-v="ai" aria-pressed="${useAiImages}" ${busy || !config?.image ? "disabled" : ""}>AI 연출 3장 추가</button><button class="btn sm ${!useAiImages ? "primary" : ""}" data-act="shortsImages" data-v="photos" aria-pressed="${!useAiImages}" ${busy ? "disabled" : ""}>원본 사진만</button></div></div>
      <div class="stack"><span class="lbl">한국어 내레이션</span><div class="row">${(
        [
          ["marin", "부드러운 목소리"],
          ["cedar", "차분한 목소리"],
          ["none", "음성 없이"],
        ] as const
      )
        .map(
          ([id, label]) =>
            `<button class="btn sm ${(id === "none" ? !narrated : narrated && voice === id) ? "primary" : ""}" data-act="shortsVoice" data-v="${id}" aria-pressed="${id === "none" ? !narrated : narrated && voice === id}" ${busy || (id !== "none" && !config?.speech) ? "disabled" : ""}>${label}</button>`,
        )
        .join("")}</div></div>
      <div class="stack"><span class="lbl">배경음악</span><div class="row">${Object.entries(
        MUSIC_LABELS,
      )
        .map(
          ([id, label]) =>
            `<button class="btn sm ${music === id ? "primary" : ""}" data-act="shortsMusic" data-v="${id}" aria-pressed="${music === id}" ${busy ? "disabled" : ""}>${label}</button>`,
        )
        .join("")}</div></div>
    </div>
    <div class="stack"><span class="lbl">대본 스타일</span><div class="row wrap">${Object.entries(
      SHORTS_SCRIPT_STYLES,
    )
      .map(
        ([id, label]) =>
          `<button class="btn sm ${scriptStyle === id ? "primary" : ""}" data-act="shortsStyle" data-v="${id}" aria-pressed="${scriptStyle === id}" ${busy ? "disabled" : ""}>${label}</button>`,
      )
      .join("")}</div></div>
    <p class="xs muted">대본은 선택한 AI로, AI 이미지·목소리는 OpenAI로 만들어요. 생성에는 API 사용료가 발생합니다. 완성 영상에 AI 연출·AI 내레이션 표시가 포함돼요.</p>
    ${configLoading ? '<p class="xs" role="status">AI 연결을 확인하고 있어요.</p>' : configError ? `<p class="small" role="alert">${esc(configError)}</p><button class="btn sm" data-act="shortsConfig">연결 다시 확인</button>` : !config?.speech || !config?.image ? '<p class="small">OpenAI 이미지·음성 연결이 필요해요. Claude만 연결된 경우 원본 사진·음성 없이 만들기를 선택할 수 있어요.</p>' : ""}
    <button class="btn primary" data-act="shortsGenerate" ${busy || !selected?.configured || !config || (narrated && !config.speech) || (useAiImages && !config.image) || !videoMimeType(true) ? "disabled" : ""}>${busy ? "숏츠 생성 중…" : error ? "이어서 숏츠 생성" : result ? "선택한 설정으로 다시 생성" : "숏츠 바로 생성"}</button>
    ${!videoMimeType(true) ? '<p class="small">영상 생성은 최신 Chrome 또는 Safari에서 이용해 주세요.</p>' : ""}
    ${busy ? `<div class="stack" role="status"><b id="shortsStage">${esc(stage)}</b><progress id="shortsProgress" max="30" value="0" ${stage.startsWith("영상 합성") ? "" : "hidden"}></progress><button class="btn sm" data-act="shortsCancel">만들기 취소</button><p class="xs muted">완성될 때까지 화면을 열어두세요. 대본·이미지·음성을 준비한 뒤 영상까지 자동으로 만들어요.</p></div>` : ""}
    ${error ? `<p class="small" role="alert">${esc(error)}</p>` : ""}
    ${
      script
        ? `<div class="stack shorts-preview-column">
      ${result ? `<video class="shorts-output" controls playsinline src="${result.url}" aria-label="완성된 30초 내레이션 숏츠"></video>` : '<canvas id="shortsPreview" width="720" height="1280" aria-label="내레이션 숏츠 미리보기"></canvas>'}
      ${result ? `<a class="btn primary" href="${result.url}" download="${esc(next.name.trim() || "홍보")}-내레이션숏츠-30초.${result.extension}">${result.extension.toUpperCase()} 다운로드 ↓</a><p class="xs muted">내용을 확인하고 새로고침 전에 파일을 저장해 주세요.</p>` : ""}
      <p class="xs muted">720 × 1280 · 장면별 확대·이동 · 문장별 자막${narrated ? " · AI 내레이션" : ""}<br>편집한 이미지 중심의 숏츠입니다.</p>
    </div>${
      !busy
        ? `<details class="shorts-editor media-advanced" ${editorOpen ? "open" : ""}><summary>대본·장면 확인 및 수정 (선택)</summary><div class="stack">
      <div class="shorts-title-fields"><label class="stack"><span class="lbl">고정 제목</span><input class="inp" data-shorts-title="title" maxlength="18" value="${esc(script.title)}" ${busy ? "disabled" : ""}></label><label class="stack"><span class="lbl">강조 문구</span><input class="inp" data-shorts-title="accent" maxlength="18" value="${esc(script.accent)}" ${busy ? "disabled" : ""}></label></div>
      <p class="xs muted">대본과 가격·시간을 확인해 주세요. 문장은 장면마다 36자 이하로 적어주세요. 장면 길이는 실제 음성에 맞춰 배분해 총 30초가 됩니다.</p>
      <ol class="shorts-scene-list">${script.scenes.map((s, i) => `<li><button class="shorts-thumb" data-act="shortsPreview" data-v="${i}" aria-label="${i + 1}번 장면 미리보기"><img src="${esc(assets[i]?.image || original(i).src)}" alt="${i + 1}번 장면"><span>${i + 1} / 6</span></button><div class="stack"><label class="stack"><span class="xs muted">기준 사진</span><select class="inp small" data-shorts-photo="${i}" ${busy ? "disabled" : ""}>${next.photos.map((p, n) => `<option value="${n}" ${s.photoIndex === n ? "selected" : ""}>${n + 1}. ${esc(p.caption.slice(0, 50) || "등록한 사진")}</option>`).join("")}</select></label><label class="stack"><span class="lbl">${i + 1}. 내레이션·자막</span><textarea class="inp" rows="2" maxlength="36" data-shorts-line="${i}" ${busy ? "disabled" : ""}>${esc(s.narration)}</textarea></label>${useAiImages && AI_SLOTS.includes(i) ? `<label class="stack"><span class="xs muted">AI 이미지 연출</span><textarea class="inp small" rows="2" maxlength="260" data-shorts-visual="${i}" ${busy ? "disabled" : ""}>${esc(s.visual)}</textarea></label>` : '<span class="xs muted">등록한 원본 사진 사용</span>'}<span class="xs muted">${assets[i]?.image ? "이미지 준비됨" : "이미지 대기"}${narrated ? (assets[i]?.audio ? " · 음성 준비됨" : " · 음성 대기") : " · 음성 없이"}</span>${assets[i]?.audio && narrated ? `<audio controls preload="metadata" src="${assets[i]!.audio}" aria-label="${i + 1}번 AI 내레이션 듣기"></audio>` : ""}</div></li>`).join("")}</ol>
      <p class="xs muted">수정한 뒤 위의 숏츠 생성 버튼을 누르면 변경한 부분을 반영해 완성해요.</p>
    </div></details>`
        : ""
    }`
        : ""
    }
  </section>`;
}

async function refreshConfig(render: () => void) {
  if (configLoading) return;
  configLoading = true;
  configError = "";
  try {
    [status, config] = await Promise.all([getAiConfiguration(), getShortsConfiguration()]);
    if (provider === "off") provider = resolveAiProvider(status);
    if (!config.image) useAiImages = false;
    if (!config.speech) narrated = false;
  } catch {
    configError = "숏츠 AI 연결을 확인하지 못했어요. 다시 확인해 주세요.";
  } finally {
    configLoading = false;
    render();
  }
}

export function mountShortsStudio(render: () => void) {
  if (!brief) return;
  if (!status && !configLoading && !configError) void refreshConfig(render);
  const token = version;
  const editor = document.querySelector<HTMLDetailsElement>(".shorts-editor");
  if (editor)
    editor.ontoggle = () => {
      if (editor.isConnected) editorOpen = editor.open;
    };
  document
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "[data-shorts-title], [data-shorts-line], [data-shorts-visual], [data-shorts-photo]",
    )
    .forEach((el) => {
      el.onchange = () => {
        if (!script || job) return;
        const title = el.dataset["shortsTitle"];
        if (title === "title" || title === "accent") script[title] = el.value;
        else if (el.dataset["shortsLine"] !== undefined) {
          const i = Number(el.dataset["shortsLine"]);
          script.scenes[i]!.narration = el.value;
          const old = assets[i];
          if (old) assets[i] = { image: old.image, ai: old.ai };
        } else if (el.dataset["shortsPhoto"] !== undefined) {
          const i = Number(el.dataset["shortsPhoto"]);
          script.scenes[i]!.photoIndex = Number(el.value);
          invalidateImage(i);
        } else {
          const i = Number(el.dataset["shortsVisual"]);
          script.scenes[i]!.visual = el.value;
          invalidateImage(i);
        }
        clearResult();
        error = "";
        editorOpen = true;
        render();
      };
    });
  if (!script || result || stage.startsWith("영상 합성")) return;
  const canvas = document.querySelector<HTMLCanvasElement>("#shortsPreview");
  if (!canvas) return;
  const p = project();
  void Promise.all(p.assets.map((a) => loadMediaImage(a.image)))
    .then((images) => {
      if (token !== version || !canvas.isConnected) return;
      const timeline = shortsTimeline([0, 0, 0, 0, 0, 0]);
      paintShortsFrame(canvas, p, images, timeline, previewIndex * 5 + 1);
    })
    .catch(() => {});
}

async function sourceImage(src: string) {
  const image = await loadMediaImage(src),
    canvas = document.createElement("canvas");
  const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export async function handleShortsAction(
  action: string,
  value: string,
  render: () => void,
  toast: (message: string) => void,
): Promise<boolean> {
  if (!action.startsWith("shorts")) return false;
  if (action === "shortsCancel") {
    job?.abort();
    return true;
  }
  if (action === "shortsConfig") {
    await refreshConfig(render);
    return true;
  }
  if (!brief || job) return true;
  if (action === "shortsPreview") {
    previewIndex = Math.max(0, Math.min(5, Number(value) || 0));
    render();
    return true;
  }
  if (action === "shortsProvider") {
    if (provider !== value && status?.providers.some((p) => p.id === value && p.configured)) {
      provider = value as AiProvider;
      script = null;
      assets = [];
      clearResult();
      error = "";
    }
    render();
    return true;
  }
  if (action === "shortsStyle") {
    if (scriptStyle !== value && Object.hasOwn(SHORTS_SCRIPT_STYLES, value)) {
      scriptStyle = value as ShortsScriptStyle;
      script = null;
      assets = [];
      clearResult();
      error = "";
    }
    render();
    return true;
  }
  if (action === "shortsImages") {
    if (useAiImages !== (value === "ai")) {
      useAiImages = value === "ai";
      AI_SLOTS.forEach(invalidateImage);
      clearResult();
    }
    render();
    return true;
  }
  if (action === "shortsVoice") {
    narrated = value !== "none";
    if (value === "marin" || value === "cedar") {
      if (voice !== value) assets = assets.map((a) => (a ? { image: a.image, ai: a.ai } : null));
      voice = value;
    }
    clearResult();
    render();
    return true;
  }
  if (action === "shortsMusic") {
    if (Object.hasOwn(MUSIC_LABELS, value)) music = value as VideoMusic;
    clearResult();
    render();
    return true;
  }
  if (action !== "shortsGenerate") return false;
  const currentBrief = brief,
    token = ++version,
    controller = new AbortController();
  job = controller;
  error = "";
  editorOpen = false;
  let audio: AudioContext | undefined;
  const closeAudio = () => {
    if (audio && audio.state !== "closed") void audio.close().catch(() => {});
  };
  controller.signal.addEventListener("abort", closeAudio, { once: true });
  const current = () => token === version && !controller.signal.aborted;
  const update = (message: string) => {
    if (!current()) return;
    stage = message;
    render();
  };
  try {
    if (provider === "off" || !status?.providers.some((p) => p.id === provider && p.configured))
      throw new Error("대본을 만들 ChatGPT 또는 Claude를 선택해 주세요.");
    if ((useAiImages && !config?.image) || (narrated && !config?.speech))
      throw new Error("선택한 이미지·내레이션의 OpenAI 연결을 확인해 주세요.");
    // Preserve browser audio permission from this click across all AI requests.
    const preparingAudio = prepareShortsAudio();
    update("숏츠 생성을 시작하고 있어요…");
    audio = await preparingAudio;
    if (!current()) return true;
    clearResult();
    if (!script) {
      update(`${PROVIDER_LABELS[provider]}로 대본과 여섯 장면을 구성하고 있어요…`);
      const result = await createAiSample(provider).json(
        shortsScriptPrompt(
          facts(currentBrief),
          currentBrief.photos.map((p) => p.caption),
          scriptStyle,
        ),
        { task: "shortsScript", signal: controller.signal },
      );
      if (!current()) return true;
      const parsed = shortsScriptSchema.parse(result);
      if (parsed.scenes.some((s) => s.photoIndex >= currentBrief.photos.length))
        throw new Error("AI가 사진 순서를 잘못 골랐어요. 대본을 다시 구성해 주세요.");
      script = parsed;
      assets = Array.from({ length: 6 }, () => null);
      clearResult();
      previewIndex = 0;
    }
    if (!shortsScriptSchema.safeParse(script).success) {
      editorOpen = true;
      throw new Error("제목은 18자, 내레이션은 5~36자, 이미지 연출은 5~260자로 적어주세요.");
    }
    clearResult();
    for (let i = 0; i < 6; i++) {
      controller.signal.throwIfAborted();
      const scene = script.scenes[i]!;
      if (!assets[i]?.image) {
        let image = original(i).src,
          ai = false;
        if (useAiImages && AI_SLOTS.includes(i)) {
          update(`${i + 1}/6 장면 · AI 연출 이미지를 만들고 있어요…`);
          const reference = await sourceImage(image);
          controller.signal.throwIfAborted();
          const response = await requestShortsImage({
            data: { facts: facts(currentBrief), visual: scene.visual, image: reference },
            signal: controller.signal,
          });
          if (!current()) return true;
          if (!response.ok) throw new Error(`${i + 1}번 이미지: ${response.error}`);
          image = response.value.image;
          ai = true;
        }
        assets[i] = { ...assets[i], image, ai };
      }
      if (narrated && !assets[i]!.audio) {
        update(`${i + 1}/6 장면 · 한국어 내레이션을 만들고 있어요…`);
        const response = await requestShortsSpeech({
          data: { text: scene.narration, voice },
          signal: controller.signal,
        });
        if (!current()) return true;
        if (!response.ok) throw new Error(`${i + 1}번 음성: ${response.error}`);
        assets[i] = {
          ...assets[i]!,
          audio: response.value.audio,
          transcript: response.value.transcript,
        };
      }
      previewIndex = i;
      update(`${i + 1}/6 장면 준비 완료`);
    }
    if (!ready()) throw new Error("일부 장면을 준비하지 못했어요. 다시 생성해 주세요.");
    clearResult();
    update("영상 합성 중 · 0 / 30초");
    const recording = await recordReferenceShorts(project(), {
      signal: controller.signal,
      music,
      audioContext: audio,
      onProgress: (seconds, canvas) => {
        if (!current()) return;
        const preview = document.querySelector<HTMLCanvasElement>("#shortsPreview");
        preview?.getContext("2d")?.drawImage(canvas, 0, 0, 720, 1280);
        const label = document.getElementById("shortsStage");
        if (label) label.textContent = `영상 합성 중 · ${Math.floor(seconds)} / 30초`;
        const bar = document.querySelector<HTMLProgressElement>("#shortsProgress");
        if (bar) bar.value = seconds;
      },
    });
    if (!current()) return true;
    result = { url: URL.createObjectURL(recording.blob), extension: recording.extension };
    toast("30초 홍보 숏츠가 완성됐어요.");
  } catch (e) {
    if (token === version)
      error = controller.signal.aborted
        ? "취소했어요. 준비된 자료는 그대로 두었어요."
        : e instanceof Error
          ? e.message
          : "숏츠를 만들지 못했어요. 다시 시도해 주세요.";
  } finally {
    controller.signal.removeEventListener("abort", closeAudio);
    closeAudio();
    if (token === version) {
      job = null;
      stage = "";
      render();
    }
  }
  return true;
}

import {
  canvasBlob,
  downloadMedia,
  makeScenes,
  MOTION_LABELS,
  paintCard,
  preparePromotionVideo,
  promotionVideoComposition,
  recordVideo,
  videoMimeType,
  type MediaBrief,
  type MediaPhoto,
  type PromotionVideoKind,
} from "./media";
import { MUSIC_LABELS, type VideoMusic } from "./video-music";
import {
  aiScenePhotos,
  aiScenesHtml,
  aiVideoConnection,
  handleAiSceneAction,
  mountAiScenes,
} from "./ai-scenes";
import "./media.css";
import {
  shortsStudioHtml,
  clearShortsStudio,
  mountShortsStudio,
  handleShortsAction,
} from "./shorts-studio";

type Material = {
  id: string;
  src: string;
  thumb?: string;
  summary?: string;
  example?: boolean;
  archived?: boolean;
  excluded?: boolean;
  faces?: boolean;
  faceApproved?: boolean;
  storePhoto?: boolean;
  status?: string;
};
type Flow = {
  topic: string;
  photoMat: string | null;
  photo: string | null;
  photoAck?: boolean;
  mats: string[];
  drafts: Record<string, { body?: string }>;
};
type Profile = { name: string; area: string; hours: string; menu?: { name: string }[] };

export function promotionBrief(
  flow: Flow,
  materials: Record<string, Material>,
  profile: Profile,
): MediaBrief {
  const ids = [...new Set([flow.photoMat, ...flow.mats].filter((id): id is string => !!id))];
  const photos: MediaPhoto[] = ids
    .map((id) => materials[id])
    .filter(
      (m): m is Material =>
        !!m &&
        m.src === "photo" &&
        !!m.thumb &&
        !m.archived &&
        !m.excluded &&
        (!m.faces || !!m.faceApproved) &&
        m.status === "ready" &&
        (m.storePhoto !== false || (m.id === flow.photoMat && !!flow.photoAck)),
    )
    .slice(0, 5)
    .map((m) => ({
      id: m.id,
      src: m.thumb!,
      caption: m.summary || flow.topic,
      example: !!m.example,
    }));
  return {
    topic: flow.topic,
    name: profile.name,
    area: profile.area,
    hours: profile.hours,
    captions: flow.drafts["shorts"]?.body || "",
    photos,
    menus: (profile.menu || []).map((item) => item.name),
  };
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
let activeBrief: MediaBrief | null = null;
let signature = "";
let controller: AbortController | null = null;
let video: { url: string; extension: string; kind: PromotionVideoKind } | null = null;
let progress = 0;
let error = "";
let generation = 0;
let selectedMusic: VideoMusic = "bright";

export function clearMediaStudio(resetShorts = true) {
  if (resetShorts) clearShortsStudio();
  generation++;
  controller?.abort();
  controller = null;
  if (video) URL.revokeObjectURL(video.url);
  video = null;
  signature = "";
  activeBrief = null;
  progress = 0;
  error = "";
}

export function mediaStudioHtml(brief: MediaBrief): string {
  const sourceBrief = brief;
  brief = { ...brief, generated: aiScenePhotos(brief) };
  const key = JSON.stringify({ brief, music: selectedMusic });
  if (signature !== key) {
    clearMediaStudio(false);
    signature = key;
    activeBrief = brief;
  }
  const photos = brief.photos,
    scenes = makeScenes(brief);
  const busy = !!controller;
  const composition = promotionVideoComposition(brief);
  const connection = aiVideoConnection();
  const noClipsMessage =
    connection === "missing"
      ? "AI 영상 서비스가 연결되지 않았어요. 지금 사진 영상을 다시 만들어도 음식이나 손님의 움직임은 추가되지 않아요."
      : connection === "error"
        ? "AI 영상 연결 상태를 불러오지 못했어요. 연결 상태를 다시 확인해 주세요."
        : connection === "checking"
          ? "AI 영상 연결 상태를 확인하고 있어요."
          : "아직 완성된 AI 동영상이 없어요. 위에서 연출 사진을 만든 뒤 ‘이 사진을 6초 AI 영상으로’를 눌러 장면을 완성해 주세요.";
  const resultKind = video?.kind === "ai" ? "AI장면포함" : "사진편집";
  return `<section class="media-studio card stack" aria-labelledby="mediaTitle">
    <div class="row between"><div class="stack" style="gap:4px"><span class="media-eyebrow">오늘의 홍보 이미지 & 영상</span><h2 id="mediaTitle">보여주면, 더 가고 싶어져요</h2><p class="small muted">사진으로 만든 이미지 카드와 30초 세로 영상, 글과 함께 준비하세요.</p></div><button class="btn sm" data-act="openPicker">사진 더 고르기</button></div>
    ${shortsStudioHtml(sourceBrief)}
    <details class="media-advanced"><summary>추가 기능 · 음식·손님이 움직이는 AI 장면</summary>${aiScenesHtml(sourceBrief)}</details>
    ${
      photos.length
        ? `<div class="media-layout">
      <div class="stack media-images"><div class="row between"><h3>홍보 이미지 <span class="chip">${photos.length}장</span></h3><span class="xs muted">4:5 · 1080 × 1350</span></div>
        <div class="media-cards">${photos.map((p, i) => `<article class="media-card"><div class="media-art"><img src="${escapeHtml(p.src)}" alt="${escapeHtml(p.caption)}"><canvas data-media-card="${i}" role="img" aria-label="${escapeHtml(i === 0 ? brief.topic : p.caption)} 홍보 이미지"></canvas></div><div class="row between media-card-footer"><span class="xs">${String(i + 1).padStart(2, "0")} ${i === 0 ? "대표 이미지" : "이야기 카드"}</span><button class="btn sm ghost" data-act="saveMediaCard" data-v="${i}" aria-label="홍보 이미지 ${i + 1} PNG 저장">PNG 저장 ↓</button></div></article>`).join("")}</div>
        <p class="xs muted">${photos.length < 3 ? "다른 구도의 사진을 2~3장 더 고르면 이미지와 영상이 더 풍성해져요." : "고른 사진 순서대로 이미지와 영상에 담아요. 최대 5장까지 사용할 수 있어요."}${photos.some((p) => p.example) ? " 예시 사진은 AI 이미지이며 실제 매장이 아닙니다." : ""}</p>
      </div>
      <div class="stack media-video-column"><details class="media-advanced"><summary>기존 사진 영상·AI 동영상 합성</summary><div class="stack"><div class="row between"><h3>30초 홍보 영상</h3><span class="chip ink">9:16</span></div>
        <div class="media-composition ${composition.aiClips ? "ready" : "pending"}" role="status"><b>완성된 AI 동영상 ${composition.aiClips}개 · ${composition.aiSeconds}초</b><p class="xs">${composition.aiClips ? `AI 장면 ${composition.aiSeconds}초 + 사진·방문 안내 ${composition.photoSeconds}초를 합성해요.` : noClipsMessage}</p>${!composition.aiClips ? `<button class="btn sm" data-act="${connection === "missing" || connection === "error" ? "sceneConfig" : "showAiScenes"}">${connection === "missing" || connection === "error" ? "AI 영상 연결 다시 확인" : "AI 장면 준비하기 ↑"}</button>` : ""}</div>
        <div class="stack" style="gap:6px"><span class="lbl">배경음악</span><div class="row" role="group" aria-label="영상 배경음악">${Object.entries(
          MUSIC_LABELS,
        )
          .map(
            ([mode, label]) =>
              `<button class="btn sm ${selectedMusic === mode ? "primary" : ""}" data-act="setVideoMusic" data-v="${mode}" aria-pressed="${selectedMusic === mode}" ${busy ? "disabled" : ""}>${label}</button>`,
          )
          .join("")}</div></div>
        <div class="media-video-stage">${video ? `<video controls playsinline preload="metadata" src="${video.url}" aria-label="완성된 30초 ${resultKind} 영상"></video>` : `<img src="${escapeHtml(photos[0]!.src)}" alt="30초 영상 첫 장면"><canvas id="mediaRecording" ${busy ? "" : "hidden"} aria-label="영상 제작 중 장면"></canvas>${!busy ? `<div class="media-video-overlay"><span class="media-play" aria-hidden="true">▷</span><b>${escapeHtml(brief.topic)}</b><span>사진 ${photos.length}장 · AI 동영상 ${composition.aiClips}개</span></div>` : ""}`}</div>
        ${busy ? `<div class="stack" style="gap:6px"><label for="mediaProgress" class="small" id="mediaProgressLabel">영상 만드는 중 · ${Math.floor(progress)} / 30초</label><progress id="mediaProgress" value="${progress}" max="30"></progress><button class="btn sm" data-act="cancelMediaVideo">만들기 취소</button><span class="xs muted">완성될 때까지 이 화면을 열어두세요.</span></div>` : video ? `<a class="btn primary" href="${video.url}" download="${escapeHtml(brief.name || "마중물")}-${resultKind}-30초.${video.extension}">${resultKind} ${video.extension.toUpperCase()} 다운로드 ↓</a><p class="xs muted">${video.kind === "photo" ? "사진을 확대·이동한 영상이에요. 음식·손님이 움직이는 AI 동영상은 포함되지 않았어요." : `AI 동영상 ${composition.aiClips}개가 포함된 영상이에요.`} 새로고침하기 전에 파일을 저장해 주세요.</p><button class="btn sm" data-act="resetMediaVideo">영상 다시 만들기</button>` : `<button class="btn primary" data-act="makeMediaVideo" ${videoMimeType(selectedMusic !== "none") && composition.aiClips ? "" : "disabled"}>AI 장면 포함 30초 영상 완성하기</button><details class="media-photo-option"><summary class="xs">사진 확대·이동 영상만 만들기</summary><p class="xs muted">선택한 사진에 음악·자막·화면 이동을 넣어요. 음식·손님의 움직임을 새로 생성하지 않아요.</p><button class="btn sm" data-act="makePhotoVideo" ${videoMimeType(selectedMusic !== "none") ? "" : "disabled"}>사진 편집 영상 만들기 · 30초</button></details>`}
        <p class="xs muted">720 × 1280 · ${selectedMusic === "none" ? "음악 없이" : MUSIC_LABELS[selectedMusic] + " 포함"}<br>${brief.generated?.some((p) => p.clip) ? `실제로 움직이는 AI 영상 ${brief.generated.filter((p) => p.clip).length}개와 사진·자막을 함께 담아요. AI 장면에는 ‘AI 연출’이 표시돼요.` : "사진 확대·축소·좌우 이동과 자막 효과를 넣어요. 위에서 6초 AI 장면을 완성하면 이 영상에 함께 담겨요."}${!videoMimeType(selectedMusic !== "none") ? "<br>이 브라우저는 영상 저장을 지원하지 않아요. 최신 Chrome 또는 Safari에서 열어주세요." : ""}</p>
        ${error ? `<p class="small" role="alert">${escapeHtml(error)}</p>` : ""}</div></details>
      </div>
    </div>
    <details class="media-scenes"><summary>30초 영상 구성 보기 <span class="muted xs">· 장면마다 6초</span></summary><ol>${scenes.map((s, i) => `<li><img src="${escapeHtml(s.photo.src)}" alt=""><span class="xs muted">${String(s.start).padStart(2, "0")}–${String(s.end).padStart(2, "0")}초<br>${s.photo.clip ? "AI 움직임 · 6초" : s.photo.aiStaged ? "AI 연출 사진" : MOTION_LABELS[i]}</span><b class="small">${escapeHtml(s.title)}</b></li>`).join("")}</ol><p class="xs muted">가운데 세 장면의 자막은 아래 ‘유튜브 쇼츠’ 탭에서 고칠 수 있어요. 사진·자막·음악이 바뀌면 영상을 다시 만들어 주세요.</p></details>`
        : `<div class="media-empty"><b>사진이 있어야 이미지와 영상을 만들 수 있어요</b><p class="small muted">메뉴, 공간, 만드는 모습 등 가게 사진을 골라주세요.</p><button class="btn primary" data-act="uploadForPost">사진 올리기</button></div>`
    }
  </section>`;
}

export function mountMediaCards(render: () => void = () => {}) {
  mountShortsStudio(render);
  mountAiScenes(render);
  if (!activeBrief) return;
  const brief = activeBrief;
  document.querySelectorAll<HTMLCanvasElement>("[data-media-card]").forEach((canvas) => {
    void paintCard(canvas, brief, Number(canvas.dataset["mediaCard"]))
      .then(() => {
        if (canvas.isConnected) canvas.classList.add("ready");
      })
      .catch(() => {
        if (canvas.isConnected) {
          canvas
            .closest(".media-card")
            ?.querySelector('[data-act="saveMediaCard"]')
            ?.setAttribute("disabled", "");
          canvas.setAttribute("aria-label", "이미지를 불러오지 못했어요. 사진을 다시 골라주세요.");
        }
      });
  });
}

export async function handleMediaAction(
  action: string,
  value: string,
  render: () => void,
  toast: (message: string) => void,
): Promise<boolean> {
  if (await handleShortsAction(action, value, render, toast)) return true;
  if (await handleAiSceneAction(action, value, render, toast)) return true;
  if (
    ![
      "saveMediaCard",
      "makeMediaVideo",
      "makePhotoVideo",
      "cancelMediaVideo",
      "setVideoMusic",
      "showAiScenes",
      "resetMediaVideo",
    ].includes(action)
  )
    return false;
  const brief = activeBrief;
  if (!brief) return true;
  if (action === "showAiScenes") {
    document.querySelector(".ai-scenes")?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("sceneStyle")?.focus({ preventScroll: true });
    return true;
  }
  if (action === "resetMediaVideo") {
    if (video) URL.revokeObjectURL(video.url);
    video = null;
    error = "";
    render();
    return true;
  }
  if (action === "setVideoMusic") {
    if (!controller && Object.hasOwn(MUSIC_LABELS, value)) {
      selectedMusic = value as VideoMusic;
      render();
    }
    return true;
  }
  if (action === "saveMediaCard") {
    try {
      const canvas = document.createElement("canvas");
      await paintCard(canvas, brief, Number(value));
      const url = URL.createObjectURL(await canvasBlob(canvas));
      downloadMedia(url, `${brief.name || "마중물"}-홍보-${Number(value) + 1}.png`);
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      toast(e instanceof Error ? e.message : "이미지를 저장하지 못했어요.");
    }
    return true;
  }
  if (action === "cancelMediaVideo") {
    controller?.abort();
    return true;
  }
  if (controller) return true;
  const kind: PromotionVideoKind = action === "makePhotoVideo" ? "photo" : "ai";
  let recordingBrief: MediaBrief;
  try {
    recordingBrief = preparePromotionVideo(brief, kind);
  } catch (e) {
    error = e instanceof Error ? e.message : "AI 동영상을 먼저 완성해 주세요.";
    render();
    return true;
  }
  const token = ++generation;
  const abort = new AbortController();
  controller = abort;
  error = "";
  progress = 0;
  render();
  try {
    const result = await recordVideo(recordingBrief, {
      signal: abort.signal,
      music: selectedMusic,
      onProgress: (seconds, canvas) => {
        progress = seconds;
        const preview = document.querySelector<HTMLCanvasElement>("#mediaRecording");
        if (preview) {
          if (preview.width !== 360) {
            preview.width = 360;
            preview.height = 640;
          }
          preview.getContext("2d")?.drawImage(canvas, 0, 0, 360, 640);
        }
        const bar = document.querySelector<HTMLProgressElement>("#mediaProgress");
        if (bar) bar.value = seconds;
        const label = document.getElementById("mediaProgressLabel");
        if (label) label.textContent = `영상 만드는 중 · ${Math.floor(seconds)} / 30초`;
      },
    });
    if (token === generation) {
      if (video) URL.revokeObjectURL(video.url);
      video = { url: URL.createObjectURL(result.blob), extension: result.extension, kind };
      toast(
        kind === "ai"
          ? "AI 장면을 포함한 30초 영상을 만들었어요."
          : "사진 편집 영상을 만들었어요. AI 동영상은 포함되지 않았어요.",
      );
    }
  } catch (e) {
    if (token === generation && !(e instanceof DOMException && e.name === "AbortError"))
      error = e instanceof Error ? e.message : "영상을 만들지 못했어요.";
  } finally {
    if (token === generation) {
      controller = null;
      render();
    }
  }
  return true;
}

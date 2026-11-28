import { buildScenePrompts, suggestSceneStyle } from "../lib/ai/scene-prompts";
import {
  SCENE_STYLES,
  sceneFactsSchema,
  type SceneConfiguration,
  type SceneFacts,
  type SceneStyle,
} from "../lib/ai/scene-contracts";
import {
  checkSceneVideo,
  getSceneConfiguration,
  requestSceneImage,
  requestSceneVideo,
} from "../lib/ai/scene-functions";
import {
  canvasBlob,
  downloadMedia,
  loadMediaImage,
  type MediaBrief,
  type MediaPhoto,
} from "./media";

type SavedScene = {
  id: string;
  context: string;
  image: string;
  facts: SceneFacts;
  example: boolean;
  ticket?: string;
  videoUrl?: string;
};
const storageKey = "gk2-ai-scenes";
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
let context = "",
  brief: MediaBrief | null = null,
  scenes: SavedScene[] = [];
let config: SceneConfiguration | null = null,
  configLoading = false,
  configError = false;
let style: SceneStyle = "sizzle",
  photoIndex = 0,
  menuIndex = 0;
let busy = "",
  error = "",
  message = "",
  version = 0;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
function persistScenes() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(scenes));
  } catch {
    message = "브라우저 저장 공간이 부족해요. 화면을 닫기 전에 결과를 다운로드해 주세요.";
  }
}
function selectContext(next: MediaBrief) {
  const key = JSON.stringify([next.name, next.area, next.photos.map((p) => p.id)]);
  if (context === key) {
    brief = next;
    return;
  }
  version++;
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = null;
  busy = "";
  error = "";
  message = "";
  context = key;
  brief = next;
  photoIndex = 0;
  menuIndex = 0;
  style = suggestSceneStyle(next.menus?.[0] || "");
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || "[]");
    scenes = Array.isArray(saved)
      ? saved
          .filter(
            (s): s is SavedScene =>
              !!s &&
              typeof s.id === "string" &&
              typeof s.context === "string" &&
              typeof s.image === "string" &&
              s.image.startsWith("data:image/jpeg;base64,") &&
              sceneFactsSchema.safeParse(s.facts).success &&
              (!s.videoUrl || /^https:\/\/([a-z0-9-]+\.)*fal\.media\//.test(s.videoUrl)) &&
              (!s.ticket || typeof s.ticket === "string"),
          )
          .slice(-6)
      : [];
  } catch {
    scenes = [];
  }
}
const current = () => scenes.filter((s) => s.context === context);
function facts(): SceneFacts {
  return {
    name: brief?.name || "",
    area: brief?.area || "",
    menus: brief?.menus || [],
    menu: brief?.menus?.[menuIndex] || "",
    style,
  };
}

export function aiScenePhotos(next: MediaBrief): MediaPhoto[] {
  selectContext(next);
  return current().map((s) => ({
    id: s.id,
    src: s.image,
    caption: s.facts.style === "guests" ? "활기찬 매장 분위기" : s.facts.menu,
    example: s.example,
    aiStaged: true,
    ...(s.videoUrl ? { clip: s.videoUrl } : {}),
  }));
}

export function aiVideoConnection(): "checking" | "error" | "missing" | "ready" {
  if (configError) return "error";
  if (!config) return "checking";
  return config.video ? "ready" : "missing";
}

export function aiScenesHtml(next: MediaBrief) {
  selectContext(next);
  if (!next.photos.length) return "";
  const items = current(),
    disabled = busy ? "disabled" : "";
  const valid = sceneFactsSchema.safeParse(facts()).success;
  const prompts = buildScenePrompts(facts());
  return `<section class="ai-scenes stack" aria-labelledby="aiSceneTitle">
    <div><span class="media-eyebrow">사진에 생동감 더하기</span><h3 id="aiSceneTitle">음식의 온기, 매장의 활기까지</h3><p class="small muted">등록 메뉴나 가상의 손님을 사진에 더하고, 실제로 움직이는 6초 AI 장면을 만들어요.</p></div>
    <div class="ai-scene-controls">
      <label class="stack small">기준 사진<select id="scenePhoto" ${disabled}>${next.photos.map((p, i) => `<option value="${i}" ${i === photoIndex ? "selected" : ""}>${i + 1}. ${esc(p.caption)}</option>`).join("")}</select></label>
      <label class="stack small">장면 연출<select id="sceneStyle" ${disabled}>${Object.entries(
        SCENE_STYLES,
      )
        .map(
          ([id, label]) =>
            `<option value="${id}" ${id === style ? "selected" : ""}>${label}</option>`,
        )
        .join("")}</select></label>
      ${style !== "guests" ? `<label class="stack small">등록된 메뉴<select id="sceneMenu" ${disabled}>${next.menus?.length ? next.menus.map((m, i) => `<option value="${i}" ${i === menuIndex ? "selected" : ""}>${esc(m)}</option>`).join("") : '<option value="">우리 가게에서 메뉴를 먼저 등록해 주세요</option>'}</select></label>` : ""}
    </div>
    <p class="xs muted">음식이 없으면 선택한 메뉴를, 빈 매장이면 가상의 성인 손님을 추가해요. 손님 연출에는 매장 내부 사진을 선택해 주세요. 매장 구조와 메뉴 모양을 확인한 뒤 사용해 주세요. 다운로드 결과에는 ‘AI 연출’이 표시돼요.</p>
    <div class="row"><button class="btn primary" data-act="sceneImage" ${disabled || !config?.image || !valid || items.length >= 3 ? "disabled" : ""}>${busy === "image" ? "연출 사진 생성 중…" : "1. AI 연출 사진 만들기"}</button><button class="btn sm ghost" data-act="sceneConfig" ${configLoading || busy ? "disabled" : ""}>연결 상태 확인</button></div>
    <p class="xs muted">${!config && !configError ? "AI 연결을 확인하고 있어요." : configError ? "연결 정보를 불러오지 못했어요. 연결 상태 확인을 눌러주세요." : !config?.image ? "이미지 AI 연결이 필요해요." : !config.video ? "AI 사진을 만들 수 있어요. 실제로 움직이는 영상은 영상 서비스 연결 후 사용할 수 있어요." : "AI 사진·영상 연결 설정이 있어요. 생성할 때마다 서비스 이용료가 발생하며, 완성까지 수 분 걸릴 수 있어요."}${config?.image && !config.video ? " 사진 생성 시 서비스 이용료가 발생해요." : ""}${items.length >= 3 ? " 이 글에는 AI 장면을 최대 3개까지 추가할 수 있어요." : ""}</p>
    ${items.length ? `<div class="ai-scene-results">${items.map((s) => `<article class="ai-scene-result stack"><div class="ai-scene-preview">${s.videoUrl ? `<video controls playsinline preload="metadata" poster="${s.image}" src="${esc(s.videoUrl)}" aria-label="${esc(SCENE_STYLES[s.facts.style])} AI 영상"></video>` : `<img src="${s.image}" alt="${esc(SCENE_STYLES[s.facts.style])} AI 연출 사진">`}<span class="ai-scene-badge">AI 연출</span></div><b class="small">${esc(s.facts.style === "guests" ? SCENE_STYLES.guests : s.facts.menu + " · " + SCENE_STYLES[s.facts.style])}</b><div class="row"><button class="btn sm" data-act="sceneSaveImage" data-v="${s.id}">블로그 사진 PNG ↓</button><button class="btn sm ghost" data-act="sceneRemove" data-v="${s.id}" ${disabled}>삭제</button></div>${s.videoUrl ? '<p class="xs">✓ 아래 30초 영상에 이 장면이 포함돼요.</p>' : s.ticket ? `<button class="btn sm" data-act="scenePoll" data-v="${s.id}" ${disabled}>${busy === s.id ? esc(message || "영상 생성 중…") : "영상 상태 다시 확인"}</button><p class="xs muted">작업이 접수됐어요. 새로고침해도 이 사진에서 상태를 확인할 수 있어요.</p>` : `<button class="btn sm primary" data-act="sceneVideo" data-v="${s.id}" ${disabled || !config?.video ? "disabled" : ""}>2. 이 사진을 6초 AI 영상으로</button>`}</article>`).join("")}</div>` : ""}
    ${error ? `<p class="small" role="alert">${esc(error)}</p>` : ""}${message && !busy ? `<p class="small" role="status">${esc(message)}</p>` : ""}
    <details class="ai-scene-prompts"><summary class="small">생성 프롬프트 확인</summary><p class="xs muted">선택한 메뉴·연출로 아래 지시를 보냅니다. 저장된 장면은 만들 때의 선택을 사용해요.</p><b class="small">사진</b><pre>${esc(prompts.image)}</pre><b class="small">영상</b><pre>${esc(prompts.video)}</pre></details>
  </section>`;
}

async function refreshConfig(render: () => void) {
  if (configLoading) return;
  configLoading = true;
  configError = false;
  try {
    config = await getSceneConfiguration();
  } catch {
    configError = true;
  } finally {
    configLoading = false;
    render();
  }
}
export function mountAiScenes(render: () => void) {
  if (!document.querySelector(".ai-scenes")) return;
  if (!config && !configError && !configLoading) void refreshConfig(render);
  for (const id of ["scenePhoto", "sceneStyle", "sceneMenu"]) {
    document.getElementById(id)?.addEventListener("change", (event) => {
      const value = (event.target as HTMLSelectElement).value;
      if (id === "scenePhoto") photoIndex = Number(value);
      if (id === "sceneStyle") style = value as SceneStyle;
      if (id === "sceneMenu") {
        menuIndex = Number(value);
        style = suggestSceneStyle(brief?.menus?.[menuIndex] || "");
      }
      error = "";
      render();
    });
  }
}
async function compressedImage(src: string) {
  const image = await loadMediaImage(src),
    canvas = document.createElement("canvas");
  const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("사진을 준비하지 못했어요.");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const result = canvas.toDataURL("image/jpeg", 0.85);
  if (result.length > 2_800_000)
    throw new Error("사진 크기가 너무 커요. 작은 사진을 선택해 주세요.");
  return result;
}
async function saveSceneImage(scene: SavedScene) {
  const image = await loadMediaImage(scene.image),
    canvas = document.createElement("canvas");
  await document.fonts?.ready;
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0);
  const pad = canvas.width * 0.035,
    font = canvas.width * 0.026;
  ctx.font = `600 ${font}px "Noto Sans KR", sans-serif`;
  const label = scene.example ? "AI 연출 · 예시 매장" : "AI 연출 이미지";
  ctx.fillStyle = "rgba(0,0,0,.72)";
  ctx.fillRect(pad, pad, ctx.measureText(label).width + pad, font * 1.8);
  ctx.fillStyle = "white";
  ctx.textBaseline = "middle";
  ctx.fillText(label, pad * 1.5, pad + font * 0.9);
  const url = URL.createObjectURL(await canvasBlob(canvas));
  downloadMedia(url, `${scene.facts.name}-AI연출-${scene.facts.menu || "매장"}.png`);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
async function poll(scene: SavedScene, render: () => void, token: number, attempts = 0) {
  if (!scene.ticket || version !== token) return;
  try {
    const result = await checkSceneVideo({ data: { ticket: scene.ticket } });
    if (version !== token) return;
    if (!result.ok) throw new Error(result.error);
    if (result.value.state === "ready") {
      scene.videoUrl = result.value.url;
      persistScenes();
      busy = "";
      message = "AI 장면이 완성됐어요. 아래에서 음악과 함께 30초 영상으로 저장하세요.";
      render();
      return;
    }
    message =
      result.value.state === "queued" ? "영상 생성 대기 중…" : "음식·손님의 움직임 생성 중…";
    if (attempts >= 90) {
      busy = "";
      message = "영상 생성이 이어지고 있어요. 잠시 후 상태를 다시 확인해 주세요.";
    } else
      pollTimer = setTimeout(() => {
        void poll(scene, render, token, attempts + 1);
      }, 10_000);
    render();
  } catch (e) {
    if (version === token) {
      busy = "";
      error = e instanceof Error ? e.message : "영상 상태를 확인하지 못했어요. 다시 확인해 주세요.";
      render();
    }
  }
}
export async function handleAiSceneAction(
  action: string,
  value: string,
  render: () => void,
  toast: (text: string) => void,
) {
  if (
    ![
      "sceneConfig",
      "sceneImage",
      "sceneVideo",
      "scenePoll",
      "sceneSaveImage",
      "sceneRemove",
    ].includes(action)
  )
    return false;
  if (action === "sceneConfig") {
    await refreshConfig(render);
    return true;
  }
  const scene = current().find((s) => s.id === value);
  if (action === "sceneSaveImage" && scene) {
    try {
      await saveSceneImage(scene);
    } catch {
      toast("사진을 저장하지 못했어요. 다시 시도해 주세요.");
    }
    return true;
  }
  if (busy) return true;
  if (action === "sceneRemove" && scene) {
    scenes = scenes.filter((s) => s !== scene);
    persistScenes();
    render();
    return true;
  }
  const token = version;
  error = "";
  message = "";
  try {
    if (action === "sceneImage") {
      if (!brief || current().length >= 3 || !config?.image) return true;
      const selected = brief.photos[photoIndex];
      if (!selected) return true;
      const data = sceneFactsSchema.parse(facts()),
        savedContext = context;
      busy = "image";
      render();
      const image = await compressedImage(selected.src);
      if (version !== token) return true;
      const result = await requestSceneImage({ data: { facts: data, image } });
      if (!result.ok) throw new Error(result.error);
      const compressed = await compressedImage(result.value.image);
      scenes = [
        ...scenes,
        {
          id: crypto.randomUUID(),
          context: savedContext,
          image: compressed,
          facts: data,
          example: selected.example,
        },
      ].slice(-6);
      persistScenes();
      if (version === token) {
        busy = "";
        render();
      }
    } else if ((action === "sceneVideo" || action === "scenePoll") && scene) {
      if (scene.videoUrl) return true;
      busy = scene.id;
      message = "영상 작업 접수 중…";
      render();
      if (!scene.ticket) {
        const result = await requestSceneVideo({
          data: { facts: scene.facts, image: scene.image },
        });
        if (!result.ok) throw new Error(result.error);
        // Save accepted jobs even if the view changed while the submission was in flight.
        scene.ticket = result.value.ticket;
        if (!scenes.some((s) => s.id === scene.id)) scenes = [...scenes, scene].slice(-6);
        else scenes = scenes.map((s) => (s.id === scene.id ? scene : s));
        persistScenes();
      }
      if (version === token) await poll(scene, render, token);
    }
  } catch (e) {
    if (version === token) {
      busy = "";
      error = e instanceof Error ? e.message : "AI 장면을 만들지 못했어요. 다시 시도해 주세요.";
      render();
    }
  }
  return true;
}

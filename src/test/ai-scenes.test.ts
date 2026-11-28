import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaBrief } from "../majungmul/media";

const api = vi.hoisted(() => ({
  configuration: vi.fn(),
  image: vi.fn(),
  video: vi.fn(),
  status: vi.fn(),
}));
vi.mock("../lib/ai/scene-functions", () => ({
  getSceneConfiguration: api.configuration,
  requestSceneImage: api.image,
  requestSceneVideo: api.video,
  checkSceneVideo: api.status,
}));

const brief: MediaBrief = {
  name: "테스트 식당",
  area: "성수",
  hours: "",
  topic: "오늘의 제육",
  captions: "",
  menus: ["제육볶음"],
  photos: [
    { id: "real-photo", src: "data:image/jpeg;base64,YWJj", caption: "빈 매장", example: false },
  ],
};
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  localStorage.clear();
  api.configuration.mockResolvedValue({
    image: true,
    video: true,
    imageModel: "image",
    videoModel: "video",
  });
  api.image.mockResolvedValue({ ok: true, value: { image: "data:image/jpeg;base64,YWJj" } });
  api.video.mockResolvedValue({ ok: true, value: { ticket: "signed-job-ticket" } });
  api.status.mockResolvedValue({
    ok: true,
    value: { state: "ready", url: "https://v3b.fal.media/movie.mp4" },
  });
  vi.stubGlobal(
    "Image",
    class {
      width = 100;
      height = 150;
      crossOrigin = "";
      onload?: () => void;
      set src(_: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,YWJj");
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function setup() {
  const studio = await import("../majungmul/ai-scenes");
  const render = vi.fn(() => {
    document.body.innerHTML = studio.aiScenesHtml(brief);
  });
  render();
  studio.mountAiScenes(render);
  await Promise.resolve();
  await Promise.resolve();
  return {
    studio,
    render,
    act: (action: string, id = "") => studio.handleAiSceneAction(action, id, render, vi.fn()),
  };
}

describe("AI scene review flow", () => {
  it("creates and persists an image, then includes the actual completed video in the media brief", async () => {
    const { studio, act } = await setup();
    await act("sceneImage");
    const saved = studio.aiScenePhotos(brief)[0]!;
    expect(saved).toMatchObject({ aiStaged: true, caption: "제육볶음" });
    expect(api.image.mock.calls[0]![0].data.facts.style).toBe("sizzle");
    await act("sceneVideo", saved.id);
    expect(studio.aiScenePhotos(brief)[0]?.clip).toBe("https://v3b.fal.media/movie.mp4");
    expect(JSON.parse(localStorage.getItem("gk2-ai-scenes")!)[0].ticket).toBe("signed-job-ticket");
    expect(api.video).toHaveBeenCalledTimes(1);
    await act("sceneVideo", saved.id);
    expect(api.video).toHaveBeenCalledTimes(1);
  });
  it("blocks duplicate creation while the first image request is pending", async () => {
    let resolve!: (value: unknown) => void;
    api.image.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { act } = await setup();
    const pending = act("sceneImage");
    await Promise.resolve();
    await Promise.resolve();
    await act("sceneImage");
    expect(api.image).toHaveBeenCalledTimes(1);
    resolve({ ok: true, value: { image: "data:image/jpeg;base64,YWJj" } });
    await pending;
  });
  it("resumes a saved failed status check without paying for a new video", async () => {
    const { studio, act } = await setup();
    await act("sceneImage");
    const id = studio.aiScenePhotos(brief)[0]!.id;
    api.status.mockResolvedValueOnce({ ok: false, error: "연결 끊김" });
    await act("sceneVideo", id);
    expect(document.querySelector('[role="alert"]')?.textContent).toBe("연결 끊김");
    await act("scenePoll", id);
    expect(api.video).toHaveBeenCalledTimes(1);
    expect(api.status).toHaveBeenCalledTimes(2);
    expect(studio.aiScenePhotos(brief)[0]?.clip).toBeTruthy();
    studio.aiScenePhotos({ ...brief, name: "다른 가게" });
    expect(studio.aiScenePhotos(brief)[0]?.clip).toBeTruthy();
  });
  it("preserves a paid image that completes after changing the post, without attaching it to the new post", async () => {
    let resolve!: (value: unknown) => void;
    api.image.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { studio, act } = await setup();
    const pending = act("sceneImage");
    await Promise.resolve();
    await Promise.resolve();
    await vi.waitFor(() => expect(api.image).toHaveBeenCalledTimes(1));
    const other = { ...brief, name: "다른 가게" };
    studio.aiScenePhotos(other);
    resolve({ ok: true, value: { image: "data:image/jpeg;base64,YWJj" } });
    await pending;
    expect(studio.aiScenePhotos(other)).toHaveLength(0);
    expect(studio.aiScenePhotos(brief)).toHaveLength(1);
  });
  it("keeps video creation disabled when the video service is missing, while enabling image generation", async () => {
    api.configuration.mockResolvedValue({
      image: true,
      video: false,
      imageModel: "image",
      videoModel: "video",
    });
    const { act } = await setup();
    await act("sceneImage");
    expect(document.querySelector<HTMLButtonElement>('[data-act="sceneVideo"]')?.disabled).toBe(
      true,
    );
    expect(document.querySelector<HTMLButtonElement>('[data-act="sceneImage"]')?.disabled).toBe(
      false,
    );
  });
});

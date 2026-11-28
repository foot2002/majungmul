import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaBrief, MediaPhoto } from "../majungmul/media";

const mocks = vi.hoisted(() => ({
  record: vi.fn(),
  generated: [] as MediaPhoto[],
  connection: "missing",
}));
vi.mock("../majungmul/media", async (original) => ({
  ...(await original<typeof import("../majungmul/media")>()),
  recordVideo: mocks.record,
  videoMimeType: () => "video/mp4",
}));
vi.mock("../majungmul/ai-scenes", () => ({
  aiScenePhotos: () => mocks.generated,
  aiScenesHtml: () => '<section class="ai-scenes"></section>',
  aiVideoConnection: () => mocks.connection,
  handleAiSceneAction: async () => false,
  mountAiScenes: () => {},
}));

const brief: MediaBrief = {
  name: "제육가게",
  area: "목동",
  hours: "10–20",
  topic: "제육볶음",
  captions: "",
  photos: [{ id: "store", src: "/store.jpg", caption: "빈 매장", example: false }],
};
const staged: MediaPhoto = {
  id: "staged",
  src: "/stew.jpg",
  caption: "제육볶음",
  example: false,
  aiStaged: true,
};

beforeEach(() => {
  vi.resetModules();
  mocks.generated = [];
  mocks.connection = "missing";
  mocks.record
    .mockReset()
    .mockResolvedValue({ blob: new Blob(["video"], { type: "video/mp4" }), extension: "mp4" });
  vi.stubGlobal(
    "URL",
    class extends URL {
      static override createObjectURL() {
        return "blob:test-video";
      }
      static override revokeObjectURL() {}
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

async function setup() {
  const studio = await import("../majungmul/media-studio");
  const render = () => {
    document.body.innerHTML = studio.mediaStudioHtml(brief);
  };
  render();
  return {
    act: (name: string) => studio.handleMediaAction(name, "", render, vi.fn()),
    studio,
    render,
  };
}

describe("30-second video creation regression", () => {
  it("makes the missing AI video connection visible and blocks the old generic action instead of silently producing a slideshow", async () => {
    const { act } = await setup();
    expect(document.querySelector(".media-composition")?.textContent).toContain(
      "완성된 AI 동영상 0개",
    );
    expect(document.querySelector(".media-composition")?.textContent).toContain(
      "AI 영상 서비스가 연결되지 않았어요",
    );
    expect(document.querySelector<HTMLButtonElement>('[data-act="makeMediaVideo"]')?.disabled).toBe(
      true,
    );
    await act("makeMediaVideo");
    expect(mocks.record).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "사진 영상으로 대신 만들지 않았어요",
    );
  });
  it("does not count a generated still image as a moving AI clip even with a configured provider", async () => {
    mocks.generated = [staged];
    mocks.connection = "ready";
    const { act } = await setup();
    expect(document.querySelector(".media-composition")?.textContent).toContain("AI 동영상 0개");
    await act("makeMediaVideo");
    expect(mocks.record).not.toHaveBeenCalled();
  });
  it("composes a completed AI clip and identifies the downloaded result as containing AI video", async () => {
    mocks.generated = [{ ...staged, clip: "https://v3b.fal.media/clip.mp4" }];
    const { act } = await setup();
    expect(document.querySelector(".media-composition")?.textContent).toContain(
      "AI 장면 6초 + 사진·방문 안내 24초",
    );
    expect(document.querySelector<HTMLButtonElement>('[data-act="makeMediaVideo"]')?.disabled).toBe(
      false,
    );
    await act("makeMediaVideo");
    expect(mocks.record).toHaveBeenCalledTimes(1);
    expect(mocks.record.mock.calls[0]![0].generated[0].clip).toBe("https://v3b.fal.media/clip.mp4");
    expect(document.querySelector("a[download]")?.getAttribute("download")).toBe(
      "제육가게-AI장면포함-30초.mp4",
    );
  });
  it("creates a photo-only video only via its explicit action and labels the result accurately", async () => {
    mocks.generated = [{ ...staged, clip: "https://v3b.fal.media/clip.mp4" }];
    const { act } = await setup();
    await act("makePhotoVideo");
    expect(mocks.record).toHaveBeenCalledTimes(1);
    expect(mocks.record.mock.calls[0]![0].generated[0].clip).toBeUndefined();
    expect(document.querySelector("a[download]")?.getAttribute("download")).toBe(
      "제육가게-사진편집-30초.mp4",
    );
    expect(document.body.textContent).toContain("AI 동영상은 포함되지 않았어요");
    await act("resetMediaVideo");
    expect(document.querySelector("a[download]")).toBeNull();
    expect(document.querySelector('[data-act="makeMediaVideo"]')).not.toBeNull();
  });
});

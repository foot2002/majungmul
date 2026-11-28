import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { shortsImageSchema } from "../lib/ai/shorts-contracts";

const mocks = vi.hoisted(() => ({
  speech: vi.fn(),
  image: vi.fn(),
  script: vi.fn(),
  record: vi.fn(),
  prepareAudio: vi.fn(),
  closeAudio: vi.fn(),
}));
vi.mock("../lib/ai/client", () => ({
  getAiConfiguration: async () => ({
    defaultProvider: "anthropic",
    providers: [
      { id: "anthropic", configured: true },
      { id: "openai", configured: true },
    ],
  }),
  resolveAiProvider: () => "anthropic",
  createAiSample: () => ({ json: mocks.script }),
}));
vi.mock("../lib/ai/shorts-functions", () => ({
  getShortsConfiguration: async () => ({ image: true, speech: true }),
  requestShortsImage: mocks.image,
  requestShortsSpeech: mocks.speech,
}));
vi.mock("../majungmul/media", () => ({
  loadMediaImage: async () => ({ width: 720, height: 720 }),
  videoMimeType: () => "video/mp4",
}));
vi.mock("../majungmul/shorts-renderer", () => ({
  paintShortsFrame: () => {},
  shortsTimeline: () => [],
  recordReferenceShorts: mocks.record,
  prepareShortsAudio: mocks.prepareAudio,
}));
const brief = {
  name: "온기카페",
  area: "성수동",
  hours: "10–21",
  topic: "유자 라떼",
  menus: ["유자 라떼"],
  captions: "",
  photos: [
    { id: "a", src: "/a.jpg", caption: "유자 라떼", example: false },
    { id: "b", src: "/b.jpg", caption: "카페 내부", example: false },
  ],
};
const script = {
  title: "성수동의 오후",
  accent: "유자 라떼",
  scenes: Array.from({ length: 6 }, () => ({
    narration: "따뜻한 유자 라떼 한 잔 어때요?",
    visual: "음료가 있는 창가 사진을 보여준다",
    photoIndex: 0,
  })),
};
beforeEach(() => {
  vi.resetModules();
  mocks.closeAudio.mockReset().mockResolvedValue(undefined);
  mocks.prepareAudio
    .mockReset()
    .mockImplementation(async () => ({ state: "running", close: mocks.closeAudio }));
  mocks.image
    .mockReset()
    .mockResolvedValue({ ok: true, value: { image: "data:image/jpeg;base64,AAAA" } });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,AAAA");
  mocks.script.mockReset().mockImplementation(async () => structuredClone(script));
  mocks.speech.mockReset().mockResolvedValue({
    ok: true,
    value: { audio: "data:audio/wav;base64,AAAA", transcript: "테스트" },
  });
  mocks.record.mockReset().mockResolvedValue({ blob: new Blob(["video"]), extension: "mp4" });
  vi.stubGlobal(
    "URL",
    class extends URL {
      static override createObjectURL() {
        return "blob:shorts";
      }
      static override revokeObjectURL() {}
    },
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function setup(input = brief) {
  const studio = await import("../majungmul/shorts-studio");
  const render = () => {
    document.body.innerHTML = studio.shortsStudioHtml(input);
    studio.mountShortsStudio(render);
  };
  render();
  await vi.waitFor(() =>
    expect(document.querySelector<HTMLButtonElement>('[data-act="shortsGenerate"]')?.disabled).toBe(
      false,
    ),
  );
  return {
    studio,
    render,
    act: (a: string, v = "") => studio.handleShortsAction(a, v, render, vi.fn()),
  };
}
describe("one-click shorts generation", () => {
  it("completes guest shorts with empty store facts through the image API validator", async () => {
    const guest = { ...brief, name: "", area: "", hours: "", menus: [] };
    mocks.image.mockImplementation(async ({ data }) => {
      shortsImageSchema.parse(data);
      return { ok: true, value: { image: "data:image/jpeg;base64,AAAA" } };
    });
    const { act } = await setup(guest);
    await act("shortsGenerate");
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(mocks.image).toHaveBeenCalledTimes(3);
    expect(mocks.image.mock.calls[0]![0].data.facts.name).toBe("");
    expect(mocks.speech).toHaveBeenCalledTimes(6);
    expect(mocks.record).toHaveBeenCalledOnce();
    expect(mocks.record.mock.calls[0]![0].name).toBe("");
    expect(document.querySelector("a[download]")?.getAttribute("download")).toBe(
      "홍보-내레이션숏츠-30초.mp4",
    );
  });
  it("unlocks audio on the initial click and completes script, images, speech and video in one action", async () => {
    const { act } = await setup();
    expect(
      document.querySelector(
        '[data-act="shortsScript"], [data-act="shortsPrepare"], [data-act="shortsRecord"]',
      ),
    ).toBeNull();
    expect(document.querySelector(".shorts-editor")).toBeNull();
    await act("shortsStyle", "visit");
    await act("shortsGenerate");
    expect(mocks.prepareAudio.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.script.mock.invocationCallOrder[0]!,
    );
    expect(mocks.script.mock.calls[0]![0]).toContain("대본 스타일: 방문 유도");
    expect(mocks.image).toHaveBeenCalledTimes(3);
    expect(mocks.speech).toHaveBeenCalledTimes(6);
    expect(mocks.record).toHaveBeenCalledOnce();
    expect(mocks.record.mock.calls[0]![1].audioContext.close).toBe(mocks.closeAudio);
    expect(mocks.closeAudio).toHaveBeenCalledOnce();
    expect(document.querySelector("a[download]")?.getAttribute("download")).toBe(
      "온기카페-내레이션숏츠-30초.mp4",
    );
    expect(document.querySelector<HTMLDetailsElement>(".shorts-editor")?.open).toBe(false);
  });
  it("keeps completed audio after failure and resumes through export without redoing the script", async () => {
    const { act } = await setup();
    await act("shortsImages", "photos");
    mocks.speech
      .mockResolvedValueOnce({
        ok: true,
        value: { audio: "data:audio/wav;base64,AAAA", transcript: "테스트" },
      })
      .mockResolvedValueOnce({ ok: false, error: "일시적인 오류" });
    await act("shortsGenerate");
    expect(mocks.speech).toHaveBeenCalledTimes(2);
    expect(mocks.record).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("2번 음성");
    expect(document.querySelector('[data-act="shortsGenerate"]')?.textContent).toBe(
      "이어서 숏츠 생성",
    );
    await act("shortsGenerate");
    expect(mocks.script).toHaveBeenCalledOnce();
    expect(mocks.speech).toHaveBeenCalledTimes(7);
    expect(mocks.record).toHaveBeenCalledOnce();
  });
  it("ignores duplicate generation clicks and does not restore late results after navigation", async () => {
    const { act, studio } = await setup();
    let finish: (v: unknown) => void = () => {};
    mocks.script.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const pending = act("shortsGenerate");
    await vi.waitFor(() => expect(mocks.script).toHaveBeenCalledOnce());
    await act("shortsGenerate");
    expect(mocks.prepareAudio).toHaveBeenCalledOnce();
    studio.clearShortsStudio();
    finish(structuredClone(script));
    await pending;
    expect(mocks.speech).not.toHaveBeenCalled();
    expect(mocks.record).not.toHaveBeenCalled();
    expect(mocks.closeAudio).toHaveBeenCalled();
    expect(studio.shortsStudioHtml({ ...brief, name: "다른 가게" })).not.toContain(
      "data-shorts-line",
    );
  });
  it("reuses paid voice clips after changing a photo and rejects an empty title", async () => {
    const { act } = await setup();
    await act("shortsImages", "photos");
    await act("shortsGenerate");
    const photo = document.querySelector<HTMLSelectElement>('[data-shorts-photo="0"]')!;
    photo.value = "1";
    photo.dispatchEvent(new Event("change"));
    await act("shortsGenerate");
    expect(mocks.speech).toHaveBeenCalledTimes(6);
    expect(mocks.record.mock.calls[1]![0].assets[0].image).toBe("/b.jpg");
    const title = document.querySelector<HTMLInputElement>('[data-shorts-title="title"]')!;
    title.value = "";
    title.dispatchEvent(new Event("change"));
    await act("shortsGenerate");
    expect(mocks.record).toHaveBeenCalledTimes(2);
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("제목은 18자");
    expect(document.querySelector<HTMLDetailsElement>(".shorts-editor")?.open).toBe(true);
  });
  it("allows original photos and captions with no image or speech generation", async () => {
    const { act } = await setup();
    await act("shortsImages", "photos");
    await act("shortsVoice", "none");
    await act("shortsGenerate");
    expect(mocks.image).not.toHaveBeenCalled();
    expect(mocks.speech).not.toHaveBeenCalled();
    expect(mocks.record.mock.calls[0]![0].narrated).toBe(false);
  });
  it("stops before paid requests when audio activation fails", async () => {
    const { act } = await setup();
    mocks.prepareAudio.mockRejectedValueOnce(new Error("음성을 시작하지 못했어요."));
    await act("shortsGenerate");
    expect(mocks.script).not.toHaveBeenCalled();
    expect(mocks.image).not.toHaveBeenCalled();
    expect(mocks.speech).not.toHaveBeenCalled();
    expect(mocks.record).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("음성을 시작하지");
  });
});

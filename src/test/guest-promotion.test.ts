import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, waitFor } from "@testing-library/dom";
import { getAiConfiguration, requestAiJson } from "@/lib/ai/functions";
import { SHELL_HTML } from "@/majungmul/shell";

vi.mock("@/lib/ai/functions", () => ({ getAiConfiguration: vi.fn(), requestAiJson: vi.fn() }));
vi.mock("@/majungmul/media-studio", () => ({
  clearMediaStudio: vi.fn(),
  handleMediaAction: async () => false,
  mediaStudioHtml: () => "",
  mountMediaCards: vi.fn(),
  promotionBrief: () => ({ photos: [] }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  document.body.innerHTML = "";
});

it("creates photo promotion without store setup and keeps saved store data out of the guest workspace", async () => {
  const savedState = JSON.stringify({
    setupDone: true,
    example: false,
    seenLanding: true,
    profile: {
      industry: "academy",
      name: "PRIVATE_STORE_NAME",
      area: "PRIVATE_AREA",
      hours: "09:00–22:00",
      menu: [{ name: "PRIVATE_MENU", price: 77777 }],
      strengths: ["PRIVATE_STRENGTH"],
      tone: "warm",
      banned: [],
      extra: {},
      fields: {},
    },
    stories: [{ q: "PRIVATE_QUESTION", a: "PRIVATE_STORY" }],
  });
  const savedMaterials = JSON.stringify({ private: { summary: "PRIVATE_MATERIAL" } });
  localStorage.setItem("gk2-state", savedState);
  localStorage.setItem("gk2-mats", savedMaterials);
  localStorage.setItem("majungmul-ai-provider", "openai");
  window.history.replaceState(null, "", "/?mode=guest");
  vi.mocked(getAiConfiguration).mockResolvedValue({
    defaultProvider: "openai",
    providers: [
      { id: "openai", label: "ChatGPT", model: "test", quickModel: "test", configured: true },
    ],
  });
  vi.stubGlobal(
    "Image",
    class {
      width = 1200;
      height = 900;
      onload: (() => void) | undefined;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:guest-photo"),
  });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
    getImageData: (_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4).fill(128),
    }),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,YWJj");
  const drafts = Object.fromEntries(
    ["blog", "insta", "shorts", "threads", "facebook", "daangn"].map((channel) => [
      channel,
      {
        title: "사진 속 음료",
        body:
          channel === "shorts"
            ? "잔에 담긴 음료\n테이블 위 한 잔\n편하게 문의해요"
            : "잔에 담긴 음료예요.\n편하게 문의해 주세요.",
      },
    ]),
  );
  vi.mocked(requestAiJson).mockResolvedValue({
    ok: true,
    provider: "openai",
    model: "test",
    json: JSON.stringify({
      topic: "사진 속 음료",
      photos: [
        {
          index: 0,
          summary: "테이블 위 음료 한 잔",
          kind: "메뉴",
          storePhoto: true,
          faces: false,
          menu: [],
        },
      ],
      drafts,
    }),
  });
  document.body.innerHTML = SHELL_HTML;
  const { startMajungmul } = await import("@/majungmul/app");
  startMajungmul();
  const el = <T extends Element = HTMLElement>(selector: string) =>
    document.querySelector<T>(selector)!;
  await waitFor(() => expect(el("#promotionProvider")).toHaveValue("openai"));
  expect(el("h1")).toHaveTextContent("사진으로 SNS 만들기");
  expect(document.querySelector("[data-field=name]")).not.toBeInTheDocument();
  expect(document.querySelector("[data-act=nav][data-v=store]")).not.toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(
    /PRIVATE_|사진과 함께 사용할 기본 정보|항상 함께 참고하는 것/,
  );
  expect(el<HTMLButtonElement>("[data-act=generate]").disabled).toBe(true);
  fireEvent.click(el("[data-act=uploadForPost]"));
  await Promise.resolve();
  fireEvent.change(el("#fileLib"), {
    target: { files: [new File(["photo"], "photo.jpg", { type: "image/jpeg" })] },
  });
  await waitFor(() => expect(document.querySelector('img[alt="대표 사진"]')).toBeInTheDocument());
  expect(el<HTMLButtonElement>("[data-act=generate]").disabled).toBe(false);
  expect(requestAiJson).not.toHaveBeenCalled();
  fireEvent.input(el("#fNote"), { target: { value: "오늘 준비한 음료를 소개해요" } });
  fireEvent.click(el("[data-act=generate]"));
  await waitFor(() => expect(document.querySelector("#dBody")).toBeInTheDocument());
  expect(requestAiJson).toHaveBeenCalledTimes(1);
  const request = vi.mocked(requestAiJson).mock.calls[0]![0].data;
  expect(request.task).toBe("photoPromotion");
  expect(request.images).toEqual(["data:image/jpeg;base64,YWJj"]);
  expect(request.prompt).toContain("오늘 준비한 음료를 소개해요");
  expect(request.prompt).not.toMatch(/PRIVATE_|77777|09:00|22:00/);
  expect(el<HTMLTextAreaElement>("#dBody").value).toContain("잔에 담긴 음료예요.");
  expect(el<HTMLTextAreaElement>("#dBody").value).toContain("편하게 문의해 주세요.");
  expect(localStorage.getItem("gk2-state")).toBe(savedState);
  expect(localStorage.getItem("gk2-mats")).toBe(savedMaterials);
  expect(Object.keys(JSON.parse(sessionStorage.getItem("gk2-guest-mats")!))).toHaveLength(1);
});

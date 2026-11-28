import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, waitFor } from "@testing-library/dom";
import { getAiConfiguration, requestAiJson } from "@/lib/ai/functions";
import type { AiResult } from "@/lib/ai/contracts";
import { SHELL_HTML } from "@/majungmul/shell";

vi.mock("@/lib/ai/functions", () => ({ getAiConfiguration: vi.fn(), requestAiJson: vi.fn() }));
vi.mock("@/majungmul/media-studio", () => ({
  clearMediaStudio: vi.fn(),
  handleMediaAction: async () => false,
  mediaStudioHtml: () => "",
  mountMediaCards: vi.fn(),
  promotionBrief: vi.fn(),
}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  document.body.innerHTML = "";
});

it("completes setup menu upload, connection retry, correction and persistence; cancelled results cannot return", async () => {
  localStorage.setItem(
    "gk2-state",
    JSON.stringify({
      example: false,
      seenLanding: true,
      profile: {
        industry: "cafe",
        name: "",
        area: "",
        hours: "",
        menu: [],
        strengths: [],
        tone: "warm",
        banned: [],
        extra: {},
        fields: {},
      },
    }),
  );
  localStorage.setItem("majungmul-ai-provider", "off");
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
      height = 1500;
      onload: (() => void) | undefined;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
  const revoke = vi.fn();
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:menu"),
  });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revoke });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,YWJj");
  document.body.innerHTML = SHELL_HTML;
  const { startMajungmul } = await import("@/majungmul/app");
  startMajungmul();
  const el = <T extends Element = HTMLElement>(selector: string) =>
    document.querySelector<T>(selector)!;
  const click = async (selector: string) => {
    fireEvent.click(el(selector));
    await Promise.resolve();
  };
  await waitFor(() => expect(getAiConfiguration).toHaveBeenCalled());
  await click("[data-act=openSetup]");
  expect(el<HTMLButtonElement>("#setupNext").disabled).toBe(true);
  for (const [id, value] of Object.entries({
    pName: "테스트 카페",
    pArea: "성수동",
    pHours: "10:00–21:00",
  }))
    fireEvent.input(el(`#${id}`), { target: { value } });
  expect(el<HTMLButtonElement>("#setupNext").disabled).toBe(false);
  await click("#setupNext");
  await click('[data-act=fieldChip][data-v="커피 전문"]');
  await click('[data-act=fieldChip][data-v="창가 자리"]');
  fireEvent.change(el("#fileMenu"), {
    target: { files: [new File(["photo"], "menu.png", { type: "image/png" })] },
  });
  await waitFor(() => expect(el("[role=alert]")).toHaveTextContent("AI를 선택"));
  expect(requestAiJson).not.toHaveBeenCalled();
  expect(revoke).toHaveBeenCalledWith("blob:menu");
  fireEvent.change(el("#menuProvider"), { target: { value: "openai" } });
  vi.mocked(requestAiJson).mockResolvedValueOnce({
    ok: false,
    error: { code: "quota_exceeded", message: "잔액을 확인해 주세요" },
  });
  await click("[data-act=menuRetry]");
  await waitFor(() => expect(el("[role=alert]")).toHaveTextContent("잔액"));
  expect(requestAiJson).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        provider: "openai",
        task: "menu",
        images: ["data:image/jpeg;base64,YWJj"],
      }),
    }),
  );
  expect(el("img[alt^=업로드한]")).toBeInTheDocument();
  vi.mocked(requestAiJson).mockResolvedValueOnce({
    ok: true,
    provider: "openai",
    model: "test",
    json: JSON.stringify({
      items: [
        { name: "커피", price: 4500 },
        { name: "케이크", price: null },
        { name: "생수", price: 0 },
      ],
    }),
  });
  await click("[data-act=menuRetry]");
  await waitFor(() => expect(document.querySelectorAll("[data-mr]")).toHaveLength(3));
  expect(el<HTMLInputElement>('[data-mr="1"]').checked).toBe(false);
  expect(el<HTMLInputElement>('[data-mr="2"]').checked).toBe(true);
  fireEvent.input(el('[data-mr-name="0"]'), { target: { value: "아메리카노" } });
  fireEvent.input(el('[data-mr-price="1"]'), { target: { value: "6,000" } });
  fireEvent.click(el('[data-mr="1"]'));
  await click("[data-act=menuApply]");
  expect(JSON.parse(localStorage.getItem("gk2-state")!).profile.menu).toEqual([
    { name: "아메리카노", price: 4500 },
    { name: "케이크", price: 6000 },
    { name: "생수", price: 0 },
  ]);
  expect(el<HTMLButtonElement>("#setupNext").disabled).toBe(false);

  let finish: (value: AiResult) => void = () => {};
  vi.mocked(requestAiJson).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  fireEvent.change(el("#fileMenu"), {
    target: { files: [new File(["photo2"], "new.png", { type: "image/png" })] },
  });
  await waitFor(() => expect(requestAiJson).toHaveBeenCalledTimes(3));
  await click("[data-act=menuStop]");
  finish({
    ok: true,
    provider: "openai",
    model: "test",
    json: JSON.stringify({ items: [{ name: "취소된 메뉴", price: 9000 }] }),
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(document.querySelector("#menuReview")).not.toBeInTheDocument();
  expect(document.querySelector("[data-act=menuRetry]")).toBeInTheDocument();
  expect(localStorage.getItem("gk2-state")).not.toContain("취소된 메뉴");
});

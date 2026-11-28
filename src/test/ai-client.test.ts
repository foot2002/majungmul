import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAiSample,
  readAiPreference,
  resolveAiProvider,
  saveAiPreference,
} from "@/lib/ai/client";
import { requestAiJson } from "@/lib/ai/functions";
import type { AiStatus } from "@/lib/ai/contracts";

vi.mock("@/lib/ai/functions", () => ({ getAiConfiguration: vi.fn(), requestAiJson: vi.fn() }));
const status: AiStatus = {
  defaultProvider: "anthropic",
  providers: [
    { id: "anthropic", label: "Claude", configured: false, model: "", quickModel: "" },
    {
      id: "openai",
      label: "ChatGPT",
      configured: true,
      model: "openai/test",
      quickModel: "openai/test",
    },
  ],
};
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("AI preferences and client adapter", () => {
  it("selects an available provider and persists an explicit off choice", () => {
    expect(resolveAiProvider(status)).toBe("openai");
    saveAiPreference("off");
    expect(readAiPreference()).toBe("off");
    expect(resolveAiProvider(status)).toBe("off");
    localStorage.setItem("majungmul-ai-provider", "invalid");
    expect(readAiPreference()).toBeNull();
  });
  it("sends image data, task and selected provider without any API key", async () => {
    vi.mocked(requestAiJson).mockResolvedValue({
      ok: true,
      json: '{"body":"안녕하세요"}',
      provider: "anthropic",
      model: "anthropic/test",
    });
    const result = await createAiSample("anthropic").json("고쳐 주세요", {
      task: "rewrite",
      images: [new Blob(["abc"], { type: "image/jpeg" })],
    });
    expect(result.body).toBe("안녕하세요");
    expect(requestAiJson).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          provider: "anthropic",
          prompt: "고쳐 주세요",
          task: "rewrite",
          modelTier: "default",
          images: ["data:image/jpeg;base64,YWJj"],
        },
      }),
    );
  });
  it("preserves server error codes for UI fallback", async () => {
    vi.mocked(requestAiJson).mockResolvedValue({
      ok: false,
      error: { code: "quota_exceeded", message: "한도를 확인해 주세요" },
    });
    await expect(
      createAiSample("openai").json("고쳐 주세요", { task: "rewrite" }),
    ).rejects.toMatchObject({ code: "quota_exceeded" });
  });
  it("rejects unsupported uploads before sending a request", async () => {
    await expect(
      createAiSample("openai").json("읽기", {
        task: "menu",
        images: [new Blob(["svg"], { type: "image/svg+xml" })],
      }),
    ).rejects.toMatchObject({ code: "invalid_response" });
    expect(requestAiJson).not.toHaveBeenCalled();
  });
  it("sends three photo promotion images in upload order", async () => {
    vi.mocked(requestAiJson).mockResolvedValue({
      ok: true,
      json: "{}",
      provider: "openai",
      model: "test",
    });
    await createAiSample("openai").json("사진으로 홍보", {
      task: "photoPromotion",
      images: ["a", "b", "c"].map((value) => new Blob([value], { type: "image/jpeg" })),
    });
    expect(requestAiJson).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          task: "photoPromotion",
          images: [
            "data:image/jpeg;base64,YQ==",
            "data:image/jpeg;base64,Yg==",
            "data:image/jpeg;base64,Yw==",
          ],
        }),
      }),
    );
  });
  it("does not send a cancelled generation", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      createAiSample("openai").json("생성", {
        task: "photoPromotion",
        images: [new Blob(["a"], { type: "image/jpeg" })],
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(requestAiJson).not.toHaveBeenCalled();
  });
});

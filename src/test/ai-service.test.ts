import { afterEach, describe, expect, it, vi } from "vitest";
import { generateSchema } from "@/lib/ai/contracts";
import {
  buildProviderRequest,
  createRequestBudget,
  generateJson,
  getAiStatus,
} from "@/lib/ai/service.server";

const env = {
  LLM_ENABLED: "true",
  ANTHROPIC_API_KEY: "test-anthropic-secret",
  OPENAI_API_KEY: "test-openai-secret",
  LLM_ANTHROPIC_MODEL: "test-claude",
  LLM_ANTHROPIC_QUICK_MODEL: "test-claude-quick",
  LLM_OPENAI_MODEL: "test-gpt",
  LLM_OPENAI_QUICK_MODEL: "test-gpt-quick",
};
const input = generateSchema.parse({ provider: "openai", task: "rewrite", prompt: "고쳐 주세요" });
const chat = (content: string, finish_reason = "stop") =>
  Response.json({ choices: [{ finish_reason, message: { content } }] });
afterEach(() => vi.useRealTimers());

describe("AI server configuration", () => {
  it("requires explicit activation, a server key and a model, and never exposes the key", () => {
    expect(getAiStatus({}).providers.every((p) => !p.configured)).toBe(true);
    expect(
      getAiStatus({ ...env, LLM_ENABLED: "false" }).providers.every((p) => !p.configured),
    ).toBe(true);
    const status = getAiStatus({ ...env, LLM_OPENAI_MODEL: "", LLM_DEFAULT_PROVIDER: "invalid" });
    expect(status.defaultProvider).toBe("anthropic");
    expect(status.providers.map((p) => p.configured)).toEqual([true, false]);
    expect(JSON.stringify(status)).not.toContain(env.ANTHROPIC_API_KEY);
    expect(JSON.stringify(status)).not.toContain(env.OPENAI_API_KEY);
  });
  it("does not contact the provider when disabled", async () => {
    const fetcher = vi.fn();
    expect(await generateJson(input, {}, fetcher)).toMatchObject({
      ok: false,
      error: { code: "not_configured" },
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("enables each provider only with its own API key", () => {
    expect(
      getAiStatus({ ...env, ANTHROPIC_API_KEY: "" }).providers.map((p) => p.configured),
    ).toEqual([false, true]);
    expect(getAiStatus({ ...env, OPENAI_API_KEY: " " }).providers.map((p) => p.configured)).toEqual(
      [true, false],
    );
  });
  it("never substitutes the other provider's credential", async () => {
    const fetcher = vi.fn();
    expect(await generateJson(input, { ...env, OPENAI_API_KEY: "" }, fetcher)).toMatchObject({
      ok: false,
      error: { code: "not_configured" },
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("provider protocols", () => {
  it("uses OpenAI Chat with JSON output and keeps the server credential out of the result", async () => {
    const fetcher = vi.fn().mockResolvedValue(chat('{"body":"수정한 글"}'));
    const result = await generateJson(input, env, fetcher);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer test-openai-secret");
    expect(JSON.parse(init.body)).toMatchObject({
      model: "test-gpt",
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });
    expect(result).toMatchObject({ ok: true, json: '{"body":"수정한 글"}', provider: "openai" });
    expect(JSON.stringify(result)).not.toContain(env.OPENAI_API_KEY);
    expect(init.headers["anthropic-version"]).toBeUndefined();
    expect(JSON.stringify(init)).not.toContain(env.ANTHROPIC_API_KEY);
  });
  it("uses Claude Messages with native image blocks and quick model selection", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        stop_reason: "end_turn",
        content: [{ type: "text", text: '{"body":"Claude 글"}' }],
      }),
    );
    const result = await generateJson(
      {
        ...input,
        provider: "anthropic",
        modelTier: "quick",
        images: ["data:image/jpeg;base64,YWJj"],
      },
      env,
      fetcher,
    );
    const [url, init] = fetcher.mock.calls[0]!;
    const payload = JSON.parse(init.body);
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(payload.model).toBe("test-claude-quick");
    expect(payload.system).toEqual(expect.any(String));
    expect(init.headers.Authorization).toBe("Bearer test-anthropic-secret");
    expect(init.headers["anthropic-version"]).toBe("2026-10-21");
    expect(payload.thinking).toEqual({ type: "disabled" });
    expect(JSON.stringify(init)).not.toContain(env.OPENAI_API_KEY);
    expect(payload.messages[0].content[1]).toEqual({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: "YWJj" },
    });
    expect(result).toMatchObject({ ok: true, provider: "anthropic" });
  });
  it("uses data URLs for OpenAI images", () => {
    const request = buildProviderRequest(
      { ...input, images: ["data:image/png;base64,YWJj"] },
      "openai/test",
    );
    expect(JSON.stringify(request.body)).toContain(
      '"image_url":{"url":"data:image/png;base64,YWJj"}',
    );
  });
  it("sends an optional Claude workspace only to Anthropic", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        stop_reason: "end_turn",
        content: [{ type: "text", text: '{"body":"글"}' }],
      }),
    );
    await generateJson(
      { ...input, provider: "anthropic" },
      { ...env, ANTHROPIC_WORKSPACE_ID: "wrkspc_test" },
      fetcher,
    );
    expect(fetcher.mock.calls[0]![1].headers["anthropic-workspace-id"]).toBe("wrkspc_test");
    fetcher.mockResolvedValue(chat('{"body":"글"}'));
    await generateJson(input, { ...env, ANTHROPIC_WORKSPACE_ID: "wrkspc_test" }, fetcher);
    expect(fetcher.mock.calls[1]![1].headers["anthropic-workspace-id"]).toBeUndefined();
  });
});

describe("request and output validation", () => {
  const photoResult = {
    topic: "사진 속 라떼",
    photos: [
      {
        index: 0,
        summary: "잔에 담긴 음료",
        kind: "메뉴",
        storePhoto: true,
        faces: false,
        menu: [],
      },
    ],
    drafts: Object.fromEntries(
      ["blog", "insta", "shorts", "threads", "facebook", "daangn"].map((channel) => [
        channel,
        { body: `${channel} 홍보 글` },
      ]),
    ),
  };
  it("returns the photo analysis and all six channels as one validated result", async () => {
    expect(
      await generateJson(
        { ...input, task: "photoPromotion", images: ["data:image/jpeg;base64,YWJj"] },
        env,
        vi.fn().mockResolvedValue(chat(JSON.stringify(photoResult))),
      ),
    ).toMatchObject({ ok: true, provider: "openai" });
  });
  it("rejects photo analysis that omits one of the uploaded images", async () => {
    expect(
      await generateJson(
        {
          ...input,
          task: "photoPromotion",
          images: ["data:image/jpeg;base64,YWJj", "data:image/jpeg;base64,YWJj"],
        },
        env,
        vi.fn().mockResolvedValue(chat(JSON.stringify(photoResult))),
      ),
    ).toMatchObject({ ok: false, error: { code: "invalid_response" } });
  });
  it("rejects arbitrary providers, models, remote images, oversized prompts and images", () => {
    for (const extra of [
      { provider: "unknown" },
      { model: "unapproved" },
      { prompt: " " },
      { prompt: "x".repeat(40_001) },
      { images: ["https://example.com/private"] },
      { images: ["data:image/svg+xml;base64,YWJj"] },
      { images: ["data:image/png;base64," + "A".repeat(2_800_001)] },
    ])
      expect(generateSchema.safeParse({ ...input, ...extra }).success).toBe(false);
  });
  it.each(["not json", '{"body":123}', '{"title":"본문 없음"}'])(
    "rejects malformed rewrite output: %s",
    async (content) => {
      expect(
        await generateJson(input, env, vi.fn().mockResolvedValue(chat(content))),
      ).toMatchObject({ ok: false, error: { code: "invalid_response" } });
    },
  );
  it("rejects partial channel drafts", async () => {
    expect(
      await generateJson(
        { ...input, task: "drafts" },
        env,
        vi.fn().mockResolvedValue(chat('{"blog":{"body":"글"}}')),
      ),
    ).toMatchObject({ ok: false, error: { code: "invalid_response" } });
  });
  it("accepts fenced JSON and nullable menu prices", async () => {
    const result = await generateJson(
      { ...input, task: "menu" },
      env,
      vi.fn().mockResolvedValue(chat('```json\n{"items":[{"name":"커피","price":null}]}\n```')),
    );
    expect(result).toMatchObject({ ok: true, json: '{"items":[{"name":"커피","price":null}]}' });
  });
  it("rejects truncated provider output even if it parses as JSON", async () => {
    expect(
      await generateJson(input, env, vi.fn().mockResolvedValue(chat('{"body":"일부"}', "length"))),
    ).toMatchObject({ ok: false, error: { code: "invalid_response" } });
  });
});

describe("provider failures", () => {
  it("explains insufficient provider credits without exposing the upstream error", async () => {
    const result = await generateJson(
      input,
      env,
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: { message: "Your credit balance is too low: private-account-details" } },
            { status: 400 },
          ),
        ),
    );
    expect(result).toMatchObject({ ok: false, error: { code: "quota_exceeded" } });
    expect(JSON.stringify(result)).not.toContain("private-account-details");
  });
  it.each([
    [401, "not_granted"],
    [403, "not_granted"],
    [402, "quota_exceeded"],
    [429, "rate_limited"],
    [500, "unavailable"],
  ])("maps HTTP %i safely", async (status, code) => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response("provider-body-containing-secret", { status: Number(status) }),
      );
    const result = await generateJson(input, env, fetcher);
    expect(result).toMatchObject({ ok: false, error: { code } });
    expect(JSON.stringify(result)).not.toContain("provider-body-containing-secret");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("aborts slow calls without retrying", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(
      (_url: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("timeout")));
        }),
    );
    const pending = generateJson(input, env, fetcher);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(await pending).toMatchObject({ ok: false, error: { code: "timeout" } });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe("request budgets", () => {
  it("limits concurrency, replenishes it, and resets the minute budget", () => {
    let now = 0;
    const budget = createRequestBudget(() => now);
    const releases = [budget.acquire()!, budget.acquire()!, budget.acquire()!];
    expect(budget.acquire()).toBeNull();
    releases.forEach((release) => release());
    for (let i = 0; i < 17; i++) budget.acquire()!();
    expect(budget.acquire()).toBeNull();
    now = 60_000;
    expect(budget.acquire()).toEqual(expect.any(Function));
  });
});

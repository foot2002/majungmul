import { describe, expect, it, vi } from "vitest";
import { sceneFactsSchema, sceneRequestSchema } from "../lib/ai/scene-contracts";
import { buildScenePrompts, suggestSceneStyle } from "../lib/ai/scene-prompts";
import {
  createSceneBudget,
  generateSceneImage,
  isSceneVideoUrl,
  makeSceneTicket,
  pollSceneVideo,
  readSceneTicket,
  sceneConfiguration,
  submitSceneVideo,
  VIDEO_MODEL,
} from "../lib/ai/scene-service.server";

const env = {
  LLM_ENABLED: "true",
  OPENAI_API_KEY: "private-image-key",
  FAL_KEY: "private-video-key",
};
const input = sceneRequestSchema.parse({
  image: "data:image/jpeg;base64,YWJj",
  facts: {
    name: "제육가게",
    area: "성수동",
    menus: ["제육볶음"],
    menu: "제육볶음",
    style: "sizzle",
  },
});
const id = "764cabcf-b745-4b3e-ae38-1200304cf45b";

describe("AI scene contracts and prompts", () => {
  it("requires a registered menu for food and accepts an empty menu only for guests", () => {
    expect(sceneFactsSchema.safeParse({ ...input.facts, menu: "없는 전골" }).success).toBe(false);
    expect(sceneFactsSchema.safeParse({ ...input.facts, menus: [], menu: "" }).success).toBe(false);
    expect(
      sceneFactsSchema.safeParse({ ...input.facts, menus: [], menu: "", style: "guests" }).success,
    ).toBe(true);
    expect(
      sceneRequestSchema.safeParse({ ...input, image: "https://localhost/private" }).success,
    ).toBe(false);
    expect(
      sceneRequestSchema.safeParse({
        ...input,
        image: "data:image/jpeg;base64," + "a".repeat(2_800_000),
      }).success,
    ).toBe(false);
    expect(sceneRequestSchema.safeParse({ ...input, model: "anything" }).success).toBe(false);
  });
  it("uses menu-specific motion, permits missing food, and protects store geometry", () => {
    expect(suggestSceneStyle("제육볶음")).toBe("sizzle");
    expect(suggestSceneStyle("김치찌개")).toBe("simmer");
    expect(suggestSceneStyle("유자 라떼")).toBe("pour");
    const prompt = buildScenePrompts(input.facts);
    expect(prompt.image).toContain("If the selected dish is missing");
    expect(prompt.image).toContain("제육볶음");
    expect(prompt.video).toContain("without turning it into soup");
    expect(prompt.video).toContain("Actual subject motion");
    const guests = buildScenePrompts({ ...input.facts, style: "guests", menu: "" });
    expect(guests.image).toContain("fictional adult customers");
    expect(guests.image).toContain("Keep the architecture unchanged");
    expect(guests.video).toContain("no crowding or extra furniture");
  });
});

describe("scene provider integration", () => {
  it("keeps credentials private and never contacts providers without configuration", async () => {
    const fetcher = vi.fn();
    expect(sceneConfiguration(env)).toMatchObject({ image: true, video: true });
    expect(JSON.stringify(sceneConfiguration(env))).not.toContain("private-");
    expect(sceneConfiguration({ ...env, LLM_ENABLED: "false" })).toMatchObject({
      image: false,
      video: false,
    });
    expect((await generateSceneImage(input, {}, fetcher)).ok).toBe(false);
    expect((await submitSceneVideo(input, {}, fetcher)).ok).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("edits the actual photo through the image API instead of generating text", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ data: [{ b64_json: "YWJj" }] }));
    expect(await generateSceneImage(input, env, fetcher)).toEqual({
      ok: true,
      value: { image: "data:image/jpeg;base64,YWJj" },
    });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://api.openai.com/v1/images/edits");
    expect(JSON.parse(init.body)).toMatchObject({
      images: [{ image_url: input.image }],
      n: 1,
      size: "1024x1536",
      output_format: "jpeg",
    });
    expect(init.headers.Authorization).toBe("Bearer private-image-key");
  });
  it("submits a six-second I2V job once and returns a resumable signed ticket", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ request_id: id, response_url: "https://evil.example" }));
    const result = await submitSceneVideo(input, env, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe(`https://queue.fal.run/${VIDEO_MODEL}`);
    expect(JSON.parse(init.body)).toMatchObject({
      start_image_url: input.image,
      duration: "6",
      generate_audio: false,
      enable_safety_checker: true,
    });
    expect(init.headers.Authorization).toBe("Key private-video-key");
    expect(result.ok).toBe(true);
    if (result.ok) expect(readSceneTicket(result.value.ticket, env.FAL_KEY)?.id).toBe(id);
    expect(JSON.stringify(result)).not.toContain("private-video-key");
  });
  it("polls the owner/app queue path and downloads only the completed job result, without resubmitting", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ status: "IN_QUEUE" }))
      .mockResolvedValueOnce(Response.json({ status: "IN_PROGRESS" }))
      .mockResolvedValueOnce(Response.json({ status: "COMPLETED" }))
      .mockResolvedValueOnce(
        Response.json({ video: { url: "https://v3b.fal.media/files/a.mp4" } }),
      );
    const ticket = makeSceneTicket(id, env.FAL_KEY);
    expect(await pollSceneVideo(ticket, env, fetcher)).toEqual({
      ok: true,
      value: { state: "queued" },
    });
    expect(await pollSceneVideo(ticket, env, fetcher)).toEqual({
      ok: true,
      value: { state: "running" },
    });
    expect(await pollSceneVideo(ticket, env, fetcher)).toEqual({
      ok: true,
      value: { state: "ready", url: "https://v3b.fal.media/files/a.mp4" },
    });
    expect(fetcher.mock.calls[0]![0]).toBe(
      `https://queue.fal.run/fal-ai/kling-video/requests/${id}/status`,
    );
    expect(fetcher.mock.calls.every(([, init]) => !init.method)).toBe(true);
  });
  it("rejects forged, expired and wrong-key job tickets before network requests", async () => {
    const ticket = makeSceneTicket(id, env.FAL_KEY, 100);
    expect(readSceneTicket(ticket, env.FAL_KEY, 200)?.id).toBe(id);
    expect(readSceneTicket(ticket, "wrong-key", 200)).toBeNull();
    expect(readSceneTicket(ticket, env.FAL_KEY, 86_400_101)).toBeNull();
    const fetcher = vi.fn();
    expect((await pollSceneVideo(ticket + "x", env, fetcher)).ok).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
    for (const url of [
      "http://fal.media/a",
      "https://fal.media.evil.com/a",
      "https://user@fal.media/a",
      "https://localhost/a",
    ])
      expect(isSceneVideoUrl(url)).toBe(false);
  });
  it("does not leak provider errors or automatically retry failed billable requests", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("private-key details", { status: 403 }));
    const result = await generateSceneImage(input, env, fetcher);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("private-key");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("bounds expensive requests by concurrency and hour", () => {
    let now = 0;
    const acquire = createSceneBudget(() => now),
      first = acquire()!,
      second = acquire()!;
    expect(acquire()).toBeNull();
    first();
    second();
    for (let i = 0; i < 10; i++) acquire()!();
    expect(acquire()).toBeNull();
    now = 3_600_000;
    expect(acquire()).toBeTypeOf("function");
  });
});

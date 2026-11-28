import { describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import type WebSocket from "ws";
import {
  shortsScriptSchema,
  shortsScriptPrompt,
  shortsImagePrompt,
} from "../lib/ai/shorts-contracts";
import {
  generateShortsImage,
  generateShortsSpeech,
  pcmWav,
  shortsConfiguration,
  speechMatches,
} from "../lib/ai/shorts-service.server";
import { paintShortsFrame, shortsTimeline } from "../majungmul/shorts-renderer";

const env = { LLM_ENABLED: "true", OPENAI_API_KEY: "test-private-key" };
const facts = {
  name: "온기카페",
  area: "성수동",
  hours: "10–21",
  topic: "유자 라떼",
  menus: ["유자 라떼"],
};
const script = {
  title: "성수동의 오후",
  accent: "유자 라떼 한 잔",
  scenes: Array.from({ length: 6 }, () => ({
    narration: "따뜻한 유자 라떼 한 잔 어때요?",
    visual: "기준 사진 속 유자 라떼를 가까이 보여준다",
    photoIndex: 0,
  })),
};

describe("reference shorts planning and timing", () => {
  it("renders a guest closing scene without an incomplete store invitation", () => {
    const fillText = vi.fn();
    const ctx = {
      fillText,
      measureText: (text: string) => ({ width: text.length * 20 }),
      fillRect: vi.fn(),
      save: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      drawImage: vi.fn(),
      restore: vi.fn(),
    };
    const canvas = { width: 720, height: 1280, getContext: () => ctx };
    const project = {
      name: "",
      area: "",
      script,
      narrated: false,
      assets: Array.from({ length: 6 }, () => ({ image: "/photo.jpg", ai: false })),
    };
    const images = Array.from({ length: 6 }, () => ({ width: 720, height: 720 }));
    const draw = () =>
      paintShortsFrame(
        canvas as unknown as HTMLCanvasElement,
        project,
        images as HTMLImageElement[],
        shortsTimeline([0, 0, 0, 0, 0, 0]),
        29,
      );
    draw();
    expect(fillText).toHaveBeenCalledWith(script.accent, 360, 1100);
    expect(fillText).not.toHaveBeenCalledWith("에서 만나요", 360, 1100);
    project.name = "온기카페";
    draw();
    expect(fillText).toHaveBeenCalledWith("온기카페에서 만나요", 360, 1100);
  });
  it("requires six bounded scenes and does not accept overlong speech", () => {
    expect(shortsScriptSchema.safeParse(script).success).toBe(true);
    expect(
      shortsScriptSchema.safeParse({ ...script, scenes: script.scenes.slice(0, 5) }).success,
    ).toBe(false);
    expect(
      shortsScriptSchema.safeParse({
        ...script,
        scenes: script.scenes.map((s) => ({ ...s, narration: "가".repeat(37) })),
      }).success,
    ).toBe(false);
    expect(shortsScriptPrompt(facts, ["유자 라떼"]).includes("없는 메뉴·가격·할인")).toBe(true);
    expect(
      shortsImagePrompt({
        facts,
        visual: "음료를 가까이 보여준다",
        image: "data:image/jpeg;base64,AAAA",
      }),
    ).toContain("No text, captions");
  });
  it("fits real speech into exactly 30 seconds, keeping each utterance within its own caption", () => {
    const durations = [2.1, 3.3, 4.2, 3.8, 2.5, 4.5];
    const timeline = shortsTimeline(durations);
    expect(timeline[0]!.start).toBe(0);
    expect(timeline[5]!.end).toBe(30);
    timeline.forEach((t, i) => {
      expect(t.speechStart + durations[i]! / t.rate).toBeLessThan(t.end);
      if (i) expect(t.start).toBe(timeline[i - 1]!.end);
    });
    expect(shortsTimeline([0, 0, 0, 0, 0, 0]).map((t) => t.end - t.start)).toEqual([
      5, 5, 5, 5, 5, 5,
    ]);
    expect(() => shortsTimeline([12, 12, 12, 12, 12, 12])).toThrow("문장을 줄인");
    expect(() => shortsTimeline([NaN, 0, 0, 0, 0, 0])).toThrow();
  });
  it("checks the narrated sentence and writes a valid 24 kHz mono WAV", () => {
    expect(speechMatches("유자 라떼 한 잔 어때요?", "유자라떼 한 잔 어때요.")).toBe(true);
    expect(speechMatches("유자 라떼 한 잔 어때요?", "전국 일등 유자 라떼입니다.")).toBe(false);
    const wav = pcmWav(Buffer.alloc(48000));
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.readUInt32LE(24)).toBe(24000);
    expect(wav.readUInt32LE(40)).toBe(48000);
    expect(() => pcmWav(Buffer.alloc(3))).toThrow();
  });
});

describe("shorts APIs without a FAL key", () => {
  it("accepts guest image requests without inventing store facts", async () => {
    const guestFacts = { ...facts, name: "", area: "", hours: "", menus: [] };
    const fetcher = vi.fn(async () => Response.json({ data: [{ b64_json: "AAAA" }] }));
    const result = await generateShortsImage(
      {
        facts: guestFacts,
        visual: "사진 속 음료를 가까이 보여준다",
        image: "data:image/jpeg;base64,AAAA",
      },
      env,
      fetcher,
    );
    expect(result.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(shortsScriptPrompt(guestFacts, ["음료 사진"])).toContain("비어 있는 가게 이름");
  });
  it("uses only server OpenAI configuration for images and speech", () => {
    expect(shortsConfiguration(env)).toEqual({ image: true, speech: true });
    expect(shortsConfiguration({ ...env, LLM_ENABLED: "false" })).toEqual({
      image: false,
      speech: false,
    });
  });
  it("edits the actual reference image and sanitizes upstream errors", async () => {
    let body: Record<string, unknown> = {};
    const input = {
      facts,
      visual: "카페의 창가를 가까이 보여준다",
      image: "data:image/jpeg;base64,AAAA",
    };
    const success = await generateShortsImage(input, env, async (_url, init) => {
      body = JSON.parse(String(init?.body));
      return Response.json({ data: [{ b64_json: "AAAA" }] });
    });
    expect(body["images"]).toEqual([{ image_url: input.image }]);
    expect(body["size"]).toBe("1024x1024");
    expect(success.ok).toBe(true);
    const failed = await generateShortsImage(
      input,
      env,
      async () => new Response("test-private-key", { status: 401 }),
    );
    expect(JSON.stringify(failed)).not.toContain("test-private-key");
    expect(failed.ok).toBe(false);
  });
  it("collects Realtime audio and closes the connection once response completes", async () => {
    let closed = false;
    class FakeSocket extends EventEmitter {
      constructor(url: string, options: { headers: Record<string, string> }) {
        super();
        expect(url).toContain("gpt-realtime-2.1-mini");
        expect(options.headers["Authorization"]).toBe("Bearer test-private-key");
        queueMicrotask(() => this.emit("open"));
      }
      send(raw: string) {
        const event = JSON.parse(raw);
        if (event.type === "session.update")
          queueMicrotask(() =>
            this.emit("message", Buffer.from(JSON.stringify({ type: "session.updated" }))),
          );
        if (event.type === "response.create")
          queueMicrotask(() => {
            for (const event of [
              {
                type: "response.output_audio.delta",
                delta: Buffer.alloc(48000).toString("base64"),
              },
              {
                type: "response.output_audio_transcript.done",
                transcript: "유자 라떼 한 잔 어때요?",
              },
              { type: "response.done", response: { status: "completed" } },
            ])
              this.emit("message", Buffer.from(JSON.stringify(event)));
          });
      }
      close() {
        closed = true;
      }
      terminate() {
        closed = true;
      }
    }
    const result = await generateShortsSpeech(
      { text: "유자 라떼 한 잔 어때요?", voice: "marin" },
      env,
      FakeSocket as unknown as typeof WebSocket,
    );
    expect(result.ok).toBe(true);
    expect(closed).toBe(true);
    if (result.ok) expect(result.value.audio).toMatch(/^data:audio\/wav;base64,/);
  });
});

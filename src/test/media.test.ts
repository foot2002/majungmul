import { describe, expect, it } from "vitest";
import {
  makeScenes,
  sceneMotion,
  VIDEO_SECONDS,
  preparePromotionVideo,
  type MediaBrief,
} from "../majungmul/media";
import { composeMusic } from "../majungmul/video-music";
import { promotionBrief } from "../majungmul/media-studio";

const profile = { name: "온기카페", area: "성수동", hours: "10:00–21:00" };
const brief: MediaBrief = {
  ...profile,
  topic: "직접 담근 유자청",
  captions: "유자를 썰어요\n설탕과 병에 담아요\n유자 라떼 5,800원",
  photos: [
    { id: "a", src: "/a.png", caption: "라떼", example: false },
    { id: "b", src: "/b.png", caption: "유자청", example: true },
    { id: "c", src: "/c.png", caption: "창가", example: false },
  ],
};

describe("promotion media", () => {
  it("rejects AI completion when its only clip lies outside the actual 30-second scene selection", () => {
    const still = {
      id: "still",
      src: "/still.jpg",
      caption: "사진",
      example: false,
      aiStaged: true,
    };
    expect(() =>
      preparePromotionVideo(
        { ...brief, generated: [still, still, still, { ...still, clip: "/unused.mp4" }] },
        "ai",
      ),
    ).toThrow("AI 동영상이 아직 0개");
  });
  it("places actual AI clips in the middle of the 30-second video and keeps the original intro and CTA", () => {
    const generated = [
      {
        id: "ai",
        src: "/ai.jpg",
        clip: "https://v3b.fal.media/ai.mp4",
        caption: "지글거리는 제육",
        example: false,
        aiStaged: true,
      },
    ];
    const scenes = makeScenes({ ...brief, generated });
    expect(scenes[0]?.photo.id).toBe("a");
    expect(scenes[1]).toMatchObject({
      title: "지글거리는 제육",
      start: 6,
      end: 12,
      photo: { clip: generated[0]!.clip, aiStaged: true },
    });
    expect(scenes[4]?.end).toBe(30);
    expect(scenes[4]?.photo.aiStaged).not.toBe(true);
  });
  it("moves a single photo visibly in both directions and zooms in and out without uncovered edges", () => {
    expect(sceneMotion(0, 1).zoom - sceneMotion(0, 0).zoom).toBeGreaterThan(0.2);
    expect(sceneMotion(1, 0).x).toBe(1);
    expect(sceneMotion(1, 1).x).toBe(0);
    expect(sceneMotion(2, 0).x).toBe(0);
    expect(sceneMotion(2, 1).x).toBe(1);
    expect(sceneMotion(3, 0).zoom - sceneMotion(3, 1).zoom).toBeGreaterThan(0.2);
    for (let scene = 0; scene < 5; scene++)
      for (const progress of [-1, 0, 0.5, 1, 2]) {
        const motion = sceneMotion(scene, progress);
        expect(motion.zoom).toBeGreaterThanOrEqual(1);
        expect(motion.x).toBeGreaterThanOrEqual(0);
        expect(motion.x).toBeLessThanOrEqual(1);
        expect(motion.y).toBeGreaterThanOrEqual(0);
        expect(motion.y).toBeLessThanOrEqual(1);
      }
  });

  it("composes 30 seconds of audible, unclipped music with quiet endpoints and distinct moods", () => {
    const bright = composeMusic("bright"),
      calm = composeMusic("calm");
    expect(bright.samples.length / bright.sampleRate).toBe(30);
    const rms = Math.sqrt(
      bright.samples.reduce((total, value) => total + value * value, 0) / bright.samples.length,
    );
    expect(rms).toBeGreaterThan(0.04);
    expect(bright.samples.every((value) => Number.isFinite(value) && Math.abs(value) <= 0.73)).toBe(
      true,
    );
    expect(bright.samples[0]).toBe(0);
    expect(Math.abs(bright.samples.at(-1)!)).toBeLessThan(0.001);
    expect(bright.samples.slice(24000, 24100)).not.toEqual(calm.samples.slice(24000, 24100));
  });
  it("covers exactly 30 seconds without gaps and uses edited captions between intro and visit details", () => {
    const scenes = makeScenes(brief);
    expect(scenes).toHaveLength(5);
    expect(scenes[0]?.start).toBe(0);
    expect(scenes.at(-1)?.end).toBe(VIDEO_SECONDS);
    scenes.slice(1).forEach((s, i) => expect(s.start).toBe(scenes[i]?.end));
    expect(scenes.slice(1, 4).map((s) => s.title)).toEqual(brief.captions.split("\n"));
    expect(scenes.at(-1)?.detail).toBe("성수동 · 10:00–21:00");
    expect(new Set(scenes.map((s) => s.photo.id)).size).toBe(3);
  });

  it("supports one photo and empty captions without inventing facts; no photos yields no video", () => {
    const scenes = makeScenes({
      ...brief,
      captions: "",
      photos: brief.photos.slice(0, 1),
      area: "",
      hours: "",
    });
    expect(scenes).toHaveLength(5);
    expect(scenes.every((s) => s.photo.id === "a")).toBe(true);
    expect(scenes[1]?.title).toBe("라떼");
    expect(scenes.at(-1)?.detail).toBe("");
    expect(makeScenes({ ...brief, photos: [] })).toEqual([]);
  });

  const photo = (id: string, extra = {}) => ({
    id,
    src: "photo",
    thumb: `/${id}.png`,
    summary: id,
    status: "ready",
    ...extra,
  });
  const flow = {
    topic: "유자 라떼",
    photoMat: "b",
    photo: "/b.png",
    mats: ["a", "b", "a", "c", "d", "e", "f"],
    drafts: { shorts: { body: "수정한 자막" } },
  };

  it("uses only selected eligible photos, preserves cover order and rejects documents, excluded or unapproved faces", () => {
    const result = promotionBrief(
      flow,
      {
        a: photo("a"),
        b: photo("b", { example: true }),
        c: photo("c", { src: "doc" }),
        d: photo("d", { excluded: true }),
        e: photo("e", { faces: true }),
        f: photo("f", { archived: true }),
        unselected: photo("unselected"),
      },
      profile,
    );
    expect(result.photos.map((p) => p.id)).toEqual(["b", "a"]);
    expect(result.photos[0]?.example).toBe(true);
    expect(result.captions).toBe("수정한 자막");
  });

  it("allows explicitly approved people and acknowledged cover images; caps output at five photos", () => {
    const materials = Object.fromEntries("abcdef".split("").map((id) => [id, photo(id)]));
    materials["a"] = photo("a", { faces: true, faceApproved: true });
    materials["b"] = photo("b", { storePhoto: false });
    expect(promotionBrief(flow, materials, profile).photos.map((p) => p.id)).not.toContain("b");
    const result = promotionBrief({ ...flow, photoAck: true }, materials, profile);
    expect(result.photos.map((p) => p.id)).toEqual(["b", "a", "c", "d", "e"]);
  });
});

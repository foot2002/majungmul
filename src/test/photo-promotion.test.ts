import { describe, expect, it } from "vitest";
import { generateSchema, photoPromotionSchema } from "@/lib/ai/contracts";
import {
  buildPhotoPromotionPrompt,
  formatPhotoDrafts,
  photoDraftQuality,
  createGenerationGate,
} from "@/lib/ai/photo-promotion";

const image = "data:image/jpeg;base64,YWJj";
describe("photo promotion contracts", () => {
  it("requires actual photo bytes and permits up to three photos only for photo promotion", () => {
    const input = { provider: "openai", task: "photoPromotion", prompt: "사진과 매장 정보" };
    expect(generateSchema.safeParse(input).success).toBe(false);
    expect(generateSchema.safeParse({ ...input, images: [image, image, image] }).success).toBe(
      true,
    );
    expect(
      generateSchema.safeParse({ ...input, images: [image, image, image, image] }).success,
    ).toBe(false);
    expect(
      generateSchema.safeParse({ ...input, task: "tags", images: [image, image] }).success,
    ).toBe(false);
  });
  it("rejects photo analysis without complete six-channel output", () => {
    expect(
      photoPromotionSchema.safeParse({
        topic: "카페",
        photos: [
          { index: 0, summary: "컵", kind: "메뉴", storePhoto: true, faces: false, menu: [] },
        ],
        drafts: { insta: { body: "글" } },
      }).success,
    ).toBe(false);
  });
  it("includes the current store, all photo indexes and optional instructions without requiring a topic", () => {
    const prompt = buildPhotoPromotionPrompt({
      storeInfo: "새 가게 · 합정동 · 라떼 5,500원",
      topic: "",
      note: "포장 안내",
      audience: [],
      reason: "",
      materials: "",
      stories: [],
      photoCount: 3,
    });
    expect(prompt).toContain("새 가게 · 합정동 · 라떼 5,500원");
    expect(prompt).toContain("포장 안내");
    expect(prompt).toContain("index=0부터 2까지");
    expect(prompt).toContain('"topic":""');
    expect(() =>
      buildPhotoPromotionPrompt({
        storeInfo: "",
        topic: "",
        note: "",
        audience: [],
        reason: "",
        materials: "",
        stories: [],
        photoCount: 0,
      }),
    ).toThrow();
  });
});

describe("generation ownership", () => {
  it("aborts a previous upload and ignores its late result when a new photo starts", () => {
    const gate = createGenerationGate();
    const old = gate.start();
    const latest = gate.start();
    expect(old.signal.aborted).toBe(true);
    expect(gate.isCurrent(old)).toBe(false);
    gate.finish(old);
    expect(gate.isCurrent(latest)).toBe(true);
  });
  it("cancels cleanly and lets a retry own the result", () => {
    const gate = createGenerationGate();
    const job = gate.start();
    gate.cancel();
    expect(job.signal.aborted).toBe(true);
    expect(gate.isCurrent(job)).toBe(false);
    const retry = gate.start();
    expect(gate.isCurrent(retry)).toBe(true);
    gate.finish(retry);
    expect(gate.isCurrent(retry)).toBe(false);
  });
});

describe("photo draft quality", () => {
  it("formats an observed single-paragraph response without changing its facts or hashtags", () => {
    const original = {
      insta: {
        body: "창가 햇살이 잘 어울리는 온기카페입니다. 나무 테이블, 유리 머그, 작은 꽃병이 있어요.\n#온기카페 #성수동카페",
      },
      threads: { body: "온기카페입니다.\n편하게 방문해 주세요." },
      shorts: { body: "햇살이 들어와요\n유리 머그와 테이블\n창가에서 만나요" },
    };
    const result = formatPhotoDrafts(original);
    expect(result.insta.body).toBe(
      "창가 햇살이 잘 어울리는 온기카페입니다.\n\n나무 테이블, 유리 머그, 작은 꽃병이 있어요.\n편하게 들러주세요.\n#온기카페 #성수동카페",
    );
    expect(result.shorts).toEqual(original.shorts);
    expect(result.threads.body).not.toContain("들러주세요");
    expect(original.insta.body).not.toContain("들러주세요");
    expect(formatPhotoDrafts(result)).toEqual(result);
  });
  it("detects the observed third-person wording and missing visit invitation", () => {
    const drafts = Object.fromEntries(
      ["blog", "insta", "shorts", "threads", "facebook", "daangn"].map((channel) => [
        channel,
        { body: channel === "shorts" ? "유자청\n창가 자리\n유자 라떼" : "온기카페에 들러주세요." },
      ]),
    );
    drafts["insta"] = {
      body: "유자청도 준비해 두셨고 창가가 있어요.\n성수동입니다.\n#성수동 #카페",
    };
    expect(photoDraftQuality(drafts)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("가게가 직접 말하는"),
        expect.stringContaining("방문·문의 안내"),
      ]),
    );
    drafts["insta"] = {
      body: "유자청을 준비했어요.\n성수동 온기카페에 들러주세요.\n#성수동 #카페",
    };
    expect(photoDraftQuality(drafts)).toEqual([]);
  });
});

import { z } from "zod";
import { shortsScriptSchema } from "./shorts-contracts";

export const providerSchema = z.enum(["anthropic", "openai"]);
export type AiProvider = z.infer<typeof providerSchema>;
export const PROVIDER_LABELS: Record<AiProvider, string> = {
  anthropic: "Claude",
  openai: "ChatGPT",
};

const text = z.string().max(12_000);
const draft = z.object({ title: text.optional(), body: text.min(1) });
export const MAX_PROMOTION_PHOTOS = 3;
const channelDrafts = z.object({
  blog: draft,
  insta: draft,
  shorts: draft,
  threads: draft,
  facebook: draft,
  daangn: draft,
});
export const photoPromotionSchema = z.object({
  topic: z.string().trim().min(1).max(80),
  photos: z
    .array(
      z.object({
        index: z
          .number()
          .int()
          .min(0)
          .max(MAX_PROMOTION_PHOTOS - 1),
        summary: z.string().trim().min(1).max(160),
        kind: z.enum(["메뉴", "공간", "사람", "과정", "이벤트", "후기", "글"]),
        storePhoto: z.boolean(),
        faces: z.boolean(),
        menu: z.array(z.string().max(80)).max(10),
      }),
    )
    .min(1)
    .max(MAX_PROMOTION_PHOTOS),
  drafts: channelDrafts,
});
export type PhotoPromotion = z.infer<typeof photoPromotionSchema>;
const fact = z.union([
  z.object({ type: z.literal("price"), item: text, value: z.number().nonnegative() }),
  z.object({ type: z.literal("event"), title: text, ends: z.string().max(10).optional() }),
]);

// Validate model output before legacy rendering and post-processing use it.
export const outputSchemas = {
  shortsScript: shortsScriptSchema,
  drafts: channelDrafts,
  photoPromotion: photoPromotionSchema,
  rewrite: draft,
  topics: z.object({
    topics: z
      .array(
        z.object({
          title: text.min(1),
          why: text,
          tag: text,
          kind: text,
          matIds: z.array(text).max(5).default([]),
          basis: z
            .array(z.object({ k: text, v: text }))
            .max(10)
            .default([]),
        }),
      )
      .min(1)
      .max(3),
  }),
  selection: z.object({ ids: z.array(text).max(5) }),
  tags: z.object({
    kind: z.enum(["메뉴", "공간", "사람", "과정", "이벤트", "후기", "글"]),
    summary: text,
    menu: z.array(text).max(50).default([]),
    tags: z.array(text).max(10).default([]),
    facts: z.array(fact).max(50).default([]),
    faces: z.boolean().default(false),
    storePhoto: z.boolean().optional(),
    topicIdea: text.optional(),
    questions: z.array(text).max(2).default([]),
  }),
  menu: z.object({
    items: z
      .array(
        z.object({ name: text.trim().min(1), price: z.number().int().nonnegative().nullable() }),
      )
      .max(100),
  }),
  connection: z.object({ connected: z.literal(true) }),
};
export type AiTask = keyof typeof outputSchemas;

export const generateSchema = z
  .object({
    provider: providerSchema,
    task: z.enum([
      "shortsScript",
      "drafts",
      "photoPromotion",
      "rewrite",
      "topics",
      "selection",
      "tags",
      "menu",
      "connection",
    ]),
    prompt: z.string().trim().min(1).max(40_000),
    modelTier: z.enum(["default", "quick"]).default("default"),
    images: z
      .array(
        z
          .string()
          .max(2_800_000)
          .regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/),
      )
      .max(MAX_PROMOTION_PHOTOS)
      .default([]),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      (value.task === "photoPromotion" && value.images.length < 1) ||
      (value.task !== "photoPromotion" && value.images.length > 1)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["images"],
        message: "사진 기반 홍보에는 1~3장, 다른 작업에는 최대 1장이 필요합니다.",
      });
    }
  });
export type GenerateInput = z.infer<typeof generateSchema>;

export interface AiStatus {
  defaultProvider: AiProvider;
  providers: {
    id: AiProvider;
    label: string;
    configured: boolean;
    model: string;
    quickModel: string;
  }[];
}

export type AiErrorCode =
  | "not_configured"
  | "not_granted"
  | "rate_limited"
  | "quota_exceeded"
  | "timeout"
  | "invalid_response"
  | "unavailable";
export type AiResult =
  | { ok: true; json: string; provider: AiProvider; model: string }
  | { ok: false; error: { code: AiErrorCode; message: string } };

export class AiClientError extends Error {
  constructor(
    public code: AiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AiClientError";
  }
}

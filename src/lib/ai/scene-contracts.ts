import { z } from "zod";

export const SCENE_STYLES = {
  simmer: "보글보글 끓는 국물",
  sizzle: "지글지글 볶음·구이",
  steam: "따뜻한 김이 나는 음식",
  pour: "음료를 따르는 순간",
  guests: "손님이 있는 활기찬 매장",
} as const;
export const sceneStyleSchema = z.enum(["simmer", "sizzle", "steam", "pour", "guests"]);
export type SceneStyle = z.infer<typeof sceneStyleSchema>;
export const sceneFactsSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    area: z.string().trim().max(160),
    menus: z.array(z.string().trim().min(1).max(120)).max(100),
    menu: z.string().trim().max(120),
    style: sceneStyleSchema,
  })
  .strict()
  .refine((v) => v.style === "guests" || (!!v.menu && v.menus.includes(v.menu)), {
    message: "등록된 메뉴에서 연출할 음식을 골라주세요.",
  });
export type SceneFacts = z.infer<typeof sceneFactsSchema>;
export const sceneRequestSchema = z
  .object({
    facts: sceneFactsSchema,
    image: z
      .string()
      .max(2_800_000)
      .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/),
  })
  .strict();
export type SceneRequest = z.infer<typeof sceneRequestSchema>;
export const sceneTicketSchema = z.object({ ticket: z.string().min(10).max(2000) }).strict();
export type SceneConfiguration = {
  image: boolean;
  video: boolean;
  imageModel: string;
  videoModel: string;
};
export type SceneResult<T> = { ok: true; value: T } | { ok: false; error: string };
export type SceneVideoStatus = { state: "queued" | "running" } | { state: "ready"; url: string };

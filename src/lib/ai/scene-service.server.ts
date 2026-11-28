import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { buildScenePrompts } from "./scene-prompts";
import {
  sceneRequestSchema,
  type SceneConfiguration,
  type SceneRequest,
  type SceneResult,
  type SceneVideoStatus,
} from "./scene-contracts";

type Environment = Record<string, string | undefined>;
export const VIDEO_MODEL = "fal-ai/kling-video/v3/pro/image-to-video";
const QUEUE = "https://queue.fal.run/fal-ai/kling-video";
export function sceneConfiguration(env: Environment = process.env): SceneConfiguration {
  return {
    image: env["LLM_ENABLED"] === "true" && !!env["OPENAI_API_KEY"]?.trim(),
    video: env["LLM_ENABLED"] === "true" && !!env["FAL_KEY"]?.trim(),
    imageModel: env["LLM_IMAGE_MODEL"]?.trim() || "gpt-image-2.6-flare",
    videoModel: VIDEO_MODEL,
  };
}

// Expensive creation is explicit and bounded. Polling never submits another job.
export function createSceneBudget(now: () => number = Date.now) {
  let start = now(),
    count = 0,
    active = 0;
  return () => {
    if (now() - start >= 3_600_000) {
      start = now();
      count = 0;
    }
    if (count >= 12 || active >= 2) return null;
    count++;
    active++;
    return () => {
      active--;
    };
  };
}
const acquire = createSceneBudget();
const fail = (error: string) => ({ ok: false as const, error });
function providerError(status: number): string {
  if (status === 401 || status === 403)
    return "AI 서비스의 API 키와 모델 사용 권한을 확인해 주세요.";
  if (status === 402 || status === 429)
    return "AI 서비스의 잔액·사용 한도를 확인하고 잠시 후 다시 시도해 주세요.";
  if (status === 400 || status === 422)
    return "이 사진이나 장면으로 생성하지 못했어요. 다른 사진·연출을 선택해 주세요.";
  return "AI 서비스에 연결하지 못했어요. 잠시 후 다시 확인해 주세요.";
}

export async function generateSceneImage(
  input: SceneRequest,
  env: Environment = process.env,
  fetcher: typeof fetch = fetch,
): Promise<SceneResult<{ image: string }>> {
  if (!sceneConfiguration(env).image)
    return fail("AI 이미지 연결이 필요해요. 관리자에게 연결을 요청해 주세요.");
  if (!sceneRequestSchema.safeParse(input).success)
    return fail("사진과 등록 메뉴를 다시 확인해 주세요.");
  const release = acquire();
  if (!release)
    return fail(
      "이미지·영상 생성 한도에 도달했어요. 진행 중인 작업이 끝나거나 잠시 후 다시 시도해 주세요.",
    );
  try {
    const response = await fetcher("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env["OPENAI_API_KEY"]!.trim()}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(180_000),
      body: JSON.stringify({
        model: sceneConfiguration(env).imageModel,
        images: [{ image_url: input.image }],
        prompt: buildScenePrompts(input.facts).image,
        n: 1,
        size: "1024x1536",
        quality: "medium",
        output_format: "jpeg",
        output_compression: 85,
      }),
    });
    if (!response.ok) return fail(providerError(response.status));
    const result = z
      .object({
        data: z
          .array(
            z.object({
              b64_json: z
                .string()
                .min(4)
                .max(12_000_000)
                .regex(/^[A-Za-z0-9+/]+={0,2}$/),
            }),
          )
          .min(1),
      })
      .safeParse(await response.json());
    if (!result.success) return fail("AI 이미지 응답을 읽지 못했어요. 다시 시도해 주세요.");
    return {
      ok: true,
      value: { image: `data:image/jpeg;base64,${result.data.data[0]!.b64_json}` },
    };
  } catch {
    return fail(
      "이미지 생성 응답을 받지 못했어요. 잠시 후 확인해 주세요. 자동으로 다시 결제 요청하지 않아요.",
    );
  } finally {
    release();
  }
}

const jobSchema = z.object({ id: z.string().uuid(), expires: z.number().int() }).strict();
function sign(payload: string, key: string) {
  return createHmac("sha256", key).update(payload).digest("base64url");
}
export function makeSceneTicket(id: string, key: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ id, expires: now + 86_400_000 })).toString(
    "base64url",
  );
  return `${payload}.${sign(payload, key)}`;
}
export function readSceneTicket(ticket: string, key: string, now = Date.now()) {
  try {
    if (ticket.length > 2000) return null;
    const [payload, signature, extra] = ticket.split(".");
    if (!payload || !signature || extra) return null;
    const expected = Buffer.from(sign(payload, key)),
      actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const job = jobSchema.parse(JSON.parse(Buffer.from(payload, "base64url").toString()));
    return job.expires > now ? job : null;
  } catch {
    return null;
  }
}
export async function submitSceneVideo(
  input: SceneRequest,
  env: Environment = process.env,
  fetcher: typeof fetch = fetch,
): Promise<SceneResult<{ ticket: string }>> {
  if (!sceneConfiguration(env).video)
    return fail("AI 영상 서비스가 아직 연결되지 않았어요. 관리자에게 연결을 요청해 주세요.");
  if (!sceneRequestSchema.safeParse(input).success)
    return fail("사진과 등록 메뉴를 다시 확인해 주세요.");
  const release = acquire();
  if (!release) return fail("이미지·영상 생성 한도에 도달했어요. 잠시 후 다시 시도해 주세요.");
  try {
    const response = await fetcher(`https://queue.fal.run/${VIDEO_MODEL}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${env["FAL_KEY"]!.trim()}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        start_image_url: input.image,
        prompt: buildScenePrompts(input.facts).video,
        duration: "6",
        generate_audio: false,
        enable_safety_checker: true,
        negative_prompt:
          "morphing, flicker, duplicate people, distorted hands, changing room layout, text, logos",
      }),
    });
    if (!response.ok) return fail(providerError(response.status));
    const result = z.object({ request_id: z.string().uuid() }).safeParse(await response.json());
    if (!result.success)
      return fail("영상 작업 번호를 받지 못했어요. 서비스 이용 내역을 확인해 주세요.");
    return {
      ok: true,
      value: { ticket: makeSceneTicket(result.data.request_id, env["FAL_KEY"]!.trim()) },
    };
  } catch {
    return fail(
      "영상 접수 응답이 끊겼어요. 중복 과금을 막기 위해 자동 재접수하지 않았어요. 서비스 이용 내역을 먼저 확인해 주세요.",
    );
  } finally {
    release();
  }
}

export function isSceneVideoUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      (url.hostname === "fal.media" || url.hostname.endsWith(".fal.media"))
    );
  } catch {
    return false;
  }
}
export async function pollSceneVideo(
  ticket: string,
  env: Environment = process.env,
  fetcher: typeof fetch = fetch,
): Promise<SceneResult<SceneVideoStatus>> {
  if (!sceneConfiguration(env).video) return fail("AI 영상 연결 설정을 확인해 주세요.");
  const job = readSceneTicket(ticket, env["FAL_KEY"]!.trim());
  if (!job) return fail("영상 작업 확인 기간이 지났거나 작업 정보가 잘못됐어요.");
  const init = {
    headers: { Authorization: `Key ${env["FAL_KEY"]!.trim()}` },
    signal: AbortSignal.timeout(30_000),
    redirect: "error" as const,
  };
  try {
    const response = await fetcher(`${QUEUE}/requests/${job.id}/status`, init);
    if (!response.ok) return fail(providerError(response.status));
    const status = z
      .object({ status: z.enum(["IN_QUEUE", "IN_PROGRESS", "COMPLETED"]) })
      .safeParse(await response.json());
    if (!status.success)
      return fail(
        "영상 생성이 종료되었거나 상태를 확인하지 못했어요. 서비스 이용 내역을 확인해 주세요.",
      );
    if (status.data.status !== "COMPLETED")
      return {
        ok: true,
        value: { state: status.data.status === "IN_QUEUE" ? "queued" : "running" },
      };
    const completed = await fetcher(`${QUEUE}/requests/${job.id}`, init);
    if (!completed.ok) return fail(providerError(completed.status));
    const result = z
      .object({ video: z.object({ url: z.string().url().refine(isSceneVideoUrl) }) })
      .safeParse(await completed.json());
    if (!result.success) return fail("완성된 영상 파일을 확인하지 못했어요.");
    return { ok: true, value: { state: "ready", url: result.data.video.url } };
  } catch {
    return fail(
      "영상 상태를 확인하지 못했어요. ‘상태 다시 확인’을 눌러주세요. 새 영상은 접수하지 않아요.",
    );
  }
}

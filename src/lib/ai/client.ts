import { getAiConfiguration, requestAiJson } from "./functions";
import {
  AiClientError,
  MAX_PROMOTION_PHOTOS,
  providerSchema,
  type AiProvider,
  type AiStatus,
  type AiTask,
} from "./contracts";

export { getAiConfiguration };
const PREFERENCE_KEY = "majungmul-ai-provider";
export function readAiPreference(): AiProvider | "off" | null {
  try {
    const saved = localStorage.getItem(PREFERENCE_KEY);
    if (saved === "off") return "off";
    const parsed = providerSchema.safeParse(saved);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
export function saveAiPreference(provider: AiProvider | "off") {
  try {
    localStorage.setItem(PREFERENCE_KEY, provider);
  } catch {
    /* Storage can be disabled. */
  }
}
export function resolveAiProvider(
  status: AiStatus,
  saved = readAiPreference(),
): AiProvider | "off" {
  if (saved) return saved;
  return (
    status.providers.find((p) => p.id === status.defaultProvider && p.configured)?.id ??
    status.providers.find((p) => p.configured)?.id ??
    "off"
  );
}
function toDataUrl(blob: Blob): Promise<string> {
  if (blob.size > 2_000_000 || !["image/jpeg", "image/png", "image/webp"].includes(blob.type)) {
    throw new AiClientError("invalid_response", "사진은 2MB 이하 JPG·PNG·WebP로 올려주세요.");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new AiClientError("invalid_response", "사진을 읽지 못했어요."));
    reader.readAsDataURL(blob);
  });
}

// Adapter for the original cap.sample contract, shared by every AI action.
export function createAiSample(provider: AiProvider) {
  return {
    limits: async () => ({ images: true }),
    async json(
      prompt: string,
      options: {
        task: AiTask;
        modelTier?: "default" | "quick";
        images?: Blob[];
        signal?: AbortSignal;
      },
    ) {
      const count = options.images?.length ?? 0;
      if (
        count > (options.task === "photoPromotion" ? MAX_PROMOTION_PHOTOS : 1) ||
        (options.task === "photoPromotion" && !count)
      )
        throw new AiClientError("invalid_response", "사진 기반 홍보에는 사진을 1~3장 골라주세요.");
      options.signal?.throwIfAborted();
      const images = await Promise.all((options.images ?? []).map(toDataUrl));
      options.signal?.throwIfAborted();
      const controller = new AbortController();
      const abort = () => controller.abort();
      options.signal?.addEventListener("abort", abort, { once: true });
      const timeout = setTimeout(abort, 65_000);
      let result;
      try {
        result = await requestAiJson({
          data: {
            provider,
            task: options.task,
            prompt,
            modelTier: options.modelTier ?? "default",
            images,
          },
          signal: controller.signal,
        });
      } catch {
        if (options.signal?.aborted) throw new DOMException("생성을 취소했어요.", "AbortError");
        throw new AiClientError(
          controller.signal.aborted ? "timeout" : "unavailable",
          controller.signal.aborted
            ? "AI 응답 시간이 길어지고 있어요. 다시 시도해 주세요."
            : "AI 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.",
        );
      } finally {
        clearTimeout(timeout);
        options.signal?.removeEventListener("abort", abort);
      }
      options.signal?.throwIfAborted();
      if (!result.ok) throw new AiClientError(result.error.code, result.error.message);
      return JSON.parse(result.json);
    },
  };
}

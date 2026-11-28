import { createServerFn } from "@tanstack/react-start";
import { shortsImageSchema, shortsSpeechSchema } from "./shorts-contracts";

export const getShortsConfiguration = createServerFn({ method: "GET" }).handler(async () => {
  const { shortsConfiguration } = await import("./shorts-service.server");
  return shortsConfiguration();
});
export const requestShortsImage = createServerFn({ method: "POST" })
  .validator(shortsImageSchema)
  .handler(async ({ data }) => {
    const { generateShortsImage } = await import("./shorts-service.server");
    return generateShortsImage(data);
  });
export const requestShortsSpeech = createServerFn({ method: "POST" })
  .validator(shortsSpeechSchema)
  .handler(async ({ data }) => {
    const { generateShortsSpeech } = await import("./shorts-service.server");
    return generateShortsSpeech(data);
  });

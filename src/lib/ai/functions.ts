import { createServerFn } from "@tanstack/react-start";
import { generateSchema } from "./contracts";

export const getAiConfiguration = createServerFn({ method: "GET" }).handler(async () => {
  const { getAiStatus } = await import("./service.server");
  return getAiStatus();
});

// Existing src/start.ts CSRF middleware protects this POST server function.
export const requestAiJson = createServerFn({ method: "POST" })
  .validator(generateSchema)
  .handler(async ({ data }) => {
    const { generateJson } = await import("./service.server");
    return generateJson(data);
  });

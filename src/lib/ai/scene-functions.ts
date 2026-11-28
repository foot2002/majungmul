import { createServerFn } from "@tanstack/react-start";
import { sceneRequestSchema, sceneTicketSchema } from "./scene-contracts";

export const getSceneConfiguration = createServerFn({ method: "GET" }).handler(async () => {
  const { sceneConfiguration } = await import("./scene-service.server");
  return sceneConfiguration();
});
export const requestSceneImage = createServerFn({ method: "POST" })
  .validator(sceneRequestSchema)
  .handler(async ({ data }) => {
    const { generateSceneImage } = await import("./scene-service.server");
    return generateSceneImage(data);
  });
export const requestSceneVideo = createServerFn({ method: "POST" })
  .validator(sceneRequestSchema)
  .handler(async ({ data }) => {
    const { submitSceneVideo } = await import("./scene-service.server");
    return submitSceneVideo(data);
  });
export const checkSceneVideo = createServerFn({ method: "POST" })
  .validator(sceneTicketSchema)
  .handler(async ({ data }) => {
    const { pollSceneVideo } = await import("./scene-service.server");
    return pollSceneVideo(data.ticket);
  });

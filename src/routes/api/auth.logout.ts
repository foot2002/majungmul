import { createFileRoute } from "@tanstack/react-router";
import {
  clearSessionCookie,
  destroySession,
  json,
  readSessionToken,
} from "@/server/auth";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        await destroySession(readSessionToken(request)).catch(() => undefined);
        return json({ ok: true }, { headers: { "set-cookie": clearSessionCookie() } });
      },
    },
  },
});

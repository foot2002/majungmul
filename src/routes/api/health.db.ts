import { createFileRoute } from "@tanstack/react-router";
import { DbConfigError, hasDatabaseUrl, pingDb } from "@/server/db";
import { json } from "@/server/auth";

export const Route = createFileRoute("/api/health/db")({
  server: {
    handlers: {
      GET: async () => {
        if (!hasDatabaseUrl()) {
          return json({ ok: false, error: "DATABASE_URL missing" }, { status: 503 });
        }
        try {
          const row = await pingDb();
          return json({ ok: true, at: row?.at ?? null });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const status = error instanceof DbConfigError ? 503 : 500;
          return json({ ok: false, error: message }, { status });
        }
      },
    },
  },
});

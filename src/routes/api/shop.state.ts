import { createFileRoute } from "@tanstack/react-router";
import { getUserFromRequest, json } from "@/server/auth";
import { getDb, hasDatabaseUrl } from "@/server/db";

export const Route = createFileRoute("/api/shop/state")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!hasDatabaseUrl()) {
          return json({ ok: false, error: "DATABASE_URL missing" }, { status: 503 });
        }
        const user = await getUserFromRequest(request);
        if (!user) return json({ ok: false, error: "unauthorized" }, { status: 401 });
        const db = getDb();
        const rows = await db`
          select state from shop_state where user_id = ${user.id}::uuid limit 1
        `;
        return json({ ok: true, state: rows[0]?.state ?? null });
      },
      PUT: async ({ request }) => {
        if (!hasDatabaseUrl()) {
          return json({ ok: false, error: "DATABASE_URL missing" }, { status: 503 });
        }
        const user = await getUserFromRequest(request);
        if (!user) return json({ ok: false, error: "unauthorized" }, { status: 401 });
        const body = (await request.json().catch(() => ({}))) as { state?: unknown };
        if (!body.state || typeof body.state !== "object") {
          return json({ ok: false, error: "state required" }, { status: 400 });
        }
        const db = getDb();
        const stateJson = JSON.stringify(body.state);
        await db`
          insert into shop_state (user_id, state, updated_at)
          values (${user.id}::uuid, ${stateJson}::jsonb, now())
          on conflict (user_id) do update
            set state = excluded.state,
                updated_at = now()
        `;
        return json({ ok: true });
      },
    },
  },
});

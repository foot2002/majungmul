import { createFileRoute } from "@tanstack/react-router";
import { getUserFromRequest, json } from "@/server/auth";
import { getDb, hasDatabaseUrl } from "@/server/db";

export const Route = createFileRoute("/api/shop/materials")({
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
          select id, data from materials where user_id = ${user.id}::uuid
        `;
        const materials: Record<string, unknown> = {};
        for (const row of rows) {
          materials[String(row.id)] = row.data;
        }
        return json({ ok: true, materials });
      },
      PUT: async ({ request }) => {
        if (!hasDatabaseUrl()) {
          return json({ ok: false, error: "DATABASE_URL missing" }, { status: 503 });
        }
        const user = await getUserFromRequest(request);
        if (!user) return json({ ok: false, error: "unauthorized" }, { status: 401 });
        const body = (await request.json().catch(() => ({}))) as {
          id?: string;
          data?: unknown;
        };
        const id = String(body.id || "").trim();
        if (!id || !body.data || typeof body.data !== "object") {
          return json({ ok: false, error: "id and data required" }, { status: 400 });
        }
        const db = getDb();
        const dataJson = JSON.stringify(body.data);
        await db`
          insert into materials (user_id, id, data, updated_at)
          values (${user.id}::uuid, ${id}, ${dataJson}::jsonb, now())
          on conflict (user_id, id) do update
            set data = excluded.data,
                updated_at = now()
        `;
        return json({ ok: true });
      },
      DELETE: async ({ request }) => {
        if (!hasDatabaseUrl()) {
          return json({ ok: false, error: "DATABASE_URL missing" }, { status: 503 });
        }
        const user = await getUserFromRequest(request);
        if (!user) return json({ ok: false, error: "unauthorized" }, { status: 401 });
        const url = new URL(request.url);
        const id = String(url.searchParams.get("id") || "").trim();
        if (!id) return json({ ok: false, error: "id required" }, { status: 400 });
        const db = getDb();
        await db`delete from materials where user_id = ${user.id}::uuid and id = ${id}`;
        return json({ ok: true });
      },
    },
  },
});

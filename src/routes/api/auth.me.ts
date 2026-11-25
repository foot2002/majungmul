import { createFileRoute } from "@tanstack/react-router";
import { getUserFromRequest, json } from "@/server/auth";
import { hasDatabaseUrl } from "@/server/db";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!hasDatabaseUrl()) {
          return json({ ok: false, user: null, db: false });
        }
        try {
          const user = await getUserFromRequest(request);
          return json({
            ok: Boolean(user),
            db: true,
            user: user ? { email: user.email, name: user.name } : null,
          });
        } catch {
          return json({ ok: false, user: null, db: false }, { status: 500 });
        }
      },
    },
  },
});

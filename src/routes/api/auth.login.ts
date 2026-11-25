import { createFileRoute } from "@tanstack/react-router";
import {
  createSession,
  json,
  sessionCookieValue,
  verifyPassword,
} from "@/server/auth";
import { getDb, hasDatabaseUrl } from "@/server/db";

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!hasDatabaseUrl()) {
          return json({ ok: false, error: "DATABASE_URL missing" }, { status: 503 });
        }
        const body = (await request.json().catch(() => ({}))) as {
          email?: string;
          password?: string;
        };
        const email = String(body.email || "")
          .trim()
          .toLowerCase();
        const password = String(body.password || "");
        if (!validEmail(email) || !password) {
          return json({ ok: false, error: "이메일과 비밀번호를 입력해 주세요" }, { status: 400 });
        }
        const db = getDb();
        const rows = await db`
          select id, email, name, password_hash
          from users
          where email = ${email}
          limit 1
        `;
        const user = rows[0];
        if (!user || !verifyPassword(password, String(user.password_hash))) {
          return json({ ok: false, error: "이메일 또는 비밀번호가 맞지 않아요" }, { status: 401 });
        }
        const { token } = await createSession(String(user.id));
        return json(
          { ok: true, user: { email: user.email, name: user.name || "" } },
          { headers: { "set-cookie": sessionCookieValue(token) } },
        );
      },
    },
  },
});

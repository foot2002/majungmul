import { createFileRoute } from "@tanstack/react-router";
import {
  createSession,
  hashPassword,
  json,
  sessionCookieValue,
} from "@/server/auth";
import { getDb, hasDatabaseUrl } from "@/server/db";

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const Route = createFileRoute("/api/auth/signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!hasDatabaseUrl()) {
          return json({ ok: false, error: "DATABASE_URL missing" }, { status: 503 });
        }
        const body = (await request.json().catch(() => ({}))) as {
          email?: string;
          password?: string;
          name?: string;
        };
        const email = String(body.email || "")
          .trim()
          .toLowerCase();
        const password = String(body.password || "");
        const name = String(body.name || "").trim();
        if (!validEmail(email)) {
          return json({ ok: false, error: "이메일 형식을 확인해 주세요" }, { status: 400 });
        }
        if (password.length < 8) {
          return json({ ok: false, error: "비밀번호는 8자 이상으로 해주세요" }, { status: 400 });
        }
        const db = getDb();
        const existing = await db`select id from users where email = ${email} limit 1`;
        if (existing[0]) {
          return json({ ok: false, error: "이미 가입된 이메일이에요. 로그인해 주세요" }, { status: 409 });
        }
        const passwordHash = hashPassword(password);
        const rows = await db`
          insert into users (email, password_hash, name)
          values (${email}, ${passwordHash}, ${name})
          returning id, email, name
        `;
        const user = rows[0];
        const { token } = await createSession(String(user.id));
        return json(
          { ok: true, user: { email: user.email, name: user.name || "" } },
          { headers: { "set-cookie": sessionCookieValue(token) } },
        );
      },
    },
  },
});

import postgres from "postgres";

let sql: ReturnType<typeof postgres> | null = null;

export function getDb() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new DbConfigError("DATABASE_URL is not set");
  }
  if (!sql) {
    const disableSsl = /sslmode=disable/i.test(url);
    sql = postgres(url, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: disableSsl ? false : "require",
    });
  }
  return sql;
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export class DbConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DbConfigError";
  }
}

export async function pingDb() {
  const db = getDb();
  const rows = await db`select 1 as ok, now() as at`;
  return rows[0];
}

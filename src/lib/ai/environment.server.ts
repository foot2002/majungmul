import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

/** Local development never falls back to production credentials in .env. */
export function developmentEnvironment(directory: string): Record<string, string> {
  const path = join(directory, ".env_dev");
  const values = existsSync(path) ? parseEnv(readFileSync(path, "utf8")) : {};
  return Object.fromEntries(
    Object.entries({ ...values, APP_ENV: "dev" }).filter(
      ([key]) =>
        key.startsWith("LLM_") ||
        [
          "ANTHROPIC_API_KEY",
          "ANTHROPIC_WORKSPACE_ID",
          "OPENAI_API_KEY",
          "FAL_KEY",
          "DATABASE_URL",
          "SESSION_COOKIE_NAME",
          "APP_ENV",
        ].includes(key),
    ),
  );
}

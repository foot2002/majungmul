import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { developmentEnvironment } from "../lib/ai/environment.server";

const directories: string[] = [];
function directory() {
  const path = mkdtempSync(join(tmpdir(), "majungmul-env-"));
  directories.push(path);
  return path;
}
afterEach(() => directories.splice(0).forEach((path) => rmSync(path, { recursive: true })));
describe("development credential isolation", () => {
  it("does not load production credentials when the development file is missing", () => {
    const path = directory();
    writeFileSync(
      join(path, ".env"),
      "OPENAI_API_KEY=production-value\nDATABASE_URL=production-db",
    );
    expect(developmentEnvironment(path)).toEqual({ APP_ENV: "dev" });
  });
  it("reads the custom development file and filters out browser-prefixed and unrelated keys", () => {
    const path = directory();
    writeFileSync(join(path, ".env"), "OPENAI_API_KEY=production-value");
    writeFileSync(
      join(path, ".env_dev"),
      'OPENAI_API_KEY="development-value"\nDATABASE_URL=development-db\nAPP_ENV=prod\nVITE_SECRET=hidden\nPATH=unexpected',
    );
    expect(developmentEnvironment(path)).toEqual({
      OPENAI_API_KEY: "development-value",
      DATABASE_URL: "development-db",
      APP_ENV: "dev",
    });
  });
});

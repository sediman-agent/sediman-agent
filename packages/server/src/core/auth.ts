import { readFile, writeFile, chmod, mkdir, rename } from "node:fs/promises";
import { getConfig } from "./config";
import logger from "./logging";

export interface AuthEntry {
  type: string;
  key: string;
  added_at: string;
}

function authFilePath(): string {
  return getConfig().authFile ?? `${process.env.HOME ?? "~"}/.terminator/auth.json`;
}

function authDir(): string {
  return authFilePath().replace(/\/[^/]+$/, "");
}

export async function ensureAuthFile(): Promise<string> {
  const dir = authDir();
  const path = authFilePath();
  await mkdir(dir, { recursive: true });
  try {
    await readFile(path, "utf-8");
  } catch {
    await writeFile(path, "{}\n", "utf-8");
    await chmod(path, 0o600);
  }
  return path;
}

export async function readStore(): Promise<Record<string, AuthEntry>> {
  try {
    await ensureAuthFile();
    const raw = await readFile(authFilePath(), "utf-8");
    if (!raw.trim()) return {};
    return JSON.parse(raw) as Record<string, AuthEntry>;
  } catch (err: any) {
    if (err instanceof SyntaxError) {
      logger.error({ path: authFilePath() }, "auth_store_corrupted");
      const ts = Math.floor(Date.now() / 1000);
      const backup = `${authFilePath()}.corrupted.${ts}`;
      try {
        await rename(authFilePath(), backup);
        logger.info({ backup }, "auth_store_backed_up");
      } catch (e) {
        logger.error({ err: e }, "auth_store_backup_failed");
      }
      return {};
    }
    logger.error({ path: authFilePath(), err }, "auth_store_read_error");
    return {};
  }
}

export async function writeStore(data: Record<string, AuthEntry>): Promise<void> {
  const path = authFilePath();
  await ensureAuthFile();
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf-8");
  await chmod(tmp, 0o600);
  await rename(tmp, path);
}

export async function getKey(provider: string): Promise<string | null> {
  const store = await readStore();
  const entry = store[provider];
  if (entry && typeof entry === "object") return entry.key ?? null;
  return null;
}

export async function setKey(provider: string, key: string): Promise<void> {
  const data = await readStore();
  data[provider] = {
    type: "api",
    key,
    added_at: new Date().toISOString(),
  };
  await writeStore(data);
  logger.info({ provider }, "auth_key_saved");
}

export async function removeKey(provider: string): Promise<boolean> {
  const data = await readStore();
  if (provider in data) {
    delete data[provider];
    await writeStore(data);
    logger.info({ provider }, "auth_key_removed");
    return true;
  }
  return false;
}

export async function listKeys(): Promise<Record<string, AuthEntry>> {
  const store = await readStore();
  const out: Record<string, AuthEntry> = {};
  for (const [k, v] of Object.entries(store)) {
    if (v && typeof v === "object") out[k] = v;
  }
  return out;
}

export async function hasKey(provider: string): Promise<boolean> {
  return (await getKey(provider)) !== null;
}

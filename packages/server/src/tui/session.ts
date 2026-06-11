import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from "node:fs";
import type { ChatMessage } from "./types.js";

const SESSION_PATH = join(homedir(), ".terminator", "session.json");

function ensureDir(): void {
  const dir = join(homedir(), ".terminator");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function saveSession(messages: ChatMessage[]): void {
  ensureDir();
  writeFileSync(SESSION_PATH, JSON.stringify(messages, null, 2), "utf-8");
}

export function loadSession(): ChatMessage[] | null {
  try {
    if (existsSync(SESSION_PATH)) {
      const content = readFileSync(SESSION_PATH, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed as ChatMessage[];
    }
  } catch {
    // corrupted or missing
  }
  return null;
}

export function deleteSession(): void {
  try {
    if (existsSync(SESSION_PATH)) unlinkSync(SESSION_PATH);
  } catch {
    // already deleted or permission issue
  }
}

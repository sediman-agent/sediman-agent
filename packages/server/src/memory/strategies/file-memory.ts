import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  unlinkSync,
  renameSync,
} from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { MemoryEntry, MemoryTarget } from "../../core/types";
import { MemoryError } from "../../core/errors";
import { getConfig } from "../../core/config";
import logger from "../../core/logging";
import { BaseMemoryStrategy } from "../strategy";

const FILES: Record<string, string> = {
  memory: "MEMORY.md",
  user: "USER.md",
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function scoreEntry(queryTokens: string[], entry: string): number {
  const entryTokens = new Set(tokenize(entry));
  let score = 0;
  for (const t of queryTokens) {
    if (entryTokens.has(t)) score += 1;
  }
  return score / Math.max(queryTokens.length, 1);
}

export class FileMemoryStrategy extends BaseMemoryStrategy {
  static override name(): string {
    return "file";
  }

  private memDir: string;
  private _initialized = false;
  private _initPromise: Promise<void> | null = null;

  constructor() {
    super();
    const config = getConfig();
    this.memDir = config.memoryDir;
  }

  private filePath(target: string): string {
    const name = FILES[target];
    if (!name) throw new MemoryError(`Unknown memory target: ${target}`);
    return join(this.memDir, name);
  }

  async initialize(): Promise<void> {
    if (this._initialized) return;
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._doInit();
    await this._initPromise;
  }

  private async _doInit(): Promise<void> {
    mkdirSync(this.memDir, { recursive: true });
    for (const name of Object.values(FILES)) {
      const fp = join(this.memDir, name);
      if (!existsSync(fp)) writeFileSync(fp, "");
    }
    this._initialized = true;
    logger.info({ memDir: this.memDir }, "file memory initialized");
  }

  private _ensureInit(): void {
    if (!this._initialized) {
      mkdirSync(this.memDir, { recursive: true });
      for (const name of Object.values(FILES)) {
        const fp = join(this.memDir, name);
        if (!existsSync(fp)) writeFileSync(fp, "");
      }
      this._initialized = true;
    }
  }

  write(
    target: string,
    content: string,
    _metadata?: Record<string, unknown>,
  ): boolean {
    this._ensureInit();
    try {
      const fp = this.filePath(target);
      const line = `- ${content.trim()}\n`;
      const tmp = `${fp}.${randomUUID()}.tmp`;
      writeFileSync(tmp, line);
      renameSync(tmp, fp);
      return true;
    } catch (err) {
      logger.error({ err, target }, "file memory write failed");
      return false;
    }
  }

  search(query: string, limit = 10): MemoryEntry[] {
    this._ensureInit();
    const queryTokens = tokenize(query);
    const results: MemoryEntry[] = [];

    for (const [target, _file] of Object.entries(FILES)) {
      const fp = this.filePath(target);
      if (!existsSync(fp)) continue;
      const lines = readFileSync(fp, "utf-8")
        .split("\n")
        .filter((l) => l.startsWith("- "));
      for (const line of lines) {
        const content = line.replace(/^-\s+/, "");
        const score = scoreEntry(queryTokens, content);
        if (score > 0) {
          results.push({
            id: `${target}:${content.slice(0, 32)}`,
            content,
            target: target as MemoryTarget,
            type: "fact",
            score,
          });
        }
      }
    }

    results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return results.slice(0, limit);
  }

  replace(
    target: string,
    oldContent: string,
    newContent: string,
  ): boolean {
    this._ensureInit();
    try {
      const fp = this.filePath(target);
      if (!existsSync(fp)) return false;
      const data = readFileSync(fp, "utf-8");
      const oldLine = `- ${oldContent.trim()}`;
      const newLine = `- ${newContent.trim()}`;
      if (!data.includes(oldLine)) return false;
      const updated = data.replace(oldLine, newLine);
      const tmp = `${fp}.${randomUUID()}.tmp`;
      writeFileSync(tmp, updated);
      renameSync(tmp, fp);
      return true;
    } catch (err) {
      logger.error({ err, target }, "file memory replace failed");
      return false;
    }
  }

  remove(target: string, content: string): boolean {
    this._ensureInit();
    try {
      const fp = this.filePath(target);
      if (!existsSync(fp)) return false;
      const data = readFileSync(fp, "utf-8");
      const line = `- ${content.trim()}`;
      if (!data.includes(line)) return false;
      const updated = data
        .split("\n")
        .filter((l) => l.trim() !== line)
        .join("\n");
      const tmp = `${fp}.${randomUUID()}.tmp`;
      writeFileSync(tmp, updated);
      renameSync(tmp, fp);
      return true;
    } catch (err) {
      logger.error({ err, target }, "file memory remove failed");
      return false;
    }
  }

  context(task: string, maxChars = 4000): string {
    this._ensureInit();
    const taskTokens = new Set(tokenize(task));
    const allEntries: Array<{ content: string; target: string; score: number }> = [];

    for (const [target, _file] of Object.entries(FILES)) {
      const fp = this.filePath(target);
      if (!existsSync(fp)) continue;
      const lines = readFileSync(fp, "utf-8")
        .split("\n")
        .filter((l) => l.startsWith("- "));
      for (const line of lines) {
        const content = line.replace(/^-\s+/, "");
        const contentTokens = new Set(tokenize(content));
        let score = 0;
        for (const t of taskTokens) {
          if (contentTokens.has(t)) score += 1;
        }
        allEntries.push({ content, target, score });
      }
    }

    allEntries.sort((a, b) => b.score - a.score);

    const sections: Record<string, string[]> = { memory: [], user: [] };
    let totalChars = 0;

    for (const entry of allEntries) {
      if (totalChars + entry.content.length > maxChars) break;
      sections[entry.target] ??= [];
      sections[entry.target].push(`- ${entry.content}`);
      totalChars += entry.content.length + 2;
    }

    const parts: string[] = [];
    if (sections.memory?.length) {
      parts.push("## Memory\n" + sections.memory.join("\n"));
    }
    if (sections.user?.length) {
      parts.push("## User\n" + sections.user.join("\n"));
    }
    return parts.join("\n\n");
  }
}

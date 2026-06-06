import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  appendFileSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import * as crypto from "node:crypto";
import * as cron from "node-cron";
import type { ScheduledTask } from "node-cron";
import { getConfig } from "../core/config";
import logger from "../core/logging";

const CRON_FIELD_RE = /^[\d*/,-]+$/;
const JOB_ID_RE = /^[a-f0-9]{1,12}$/;

/**
 * Validate a single cron field value against its allowed range
 */
function validateCronField(field: string, min: number, max: number): boolean {
  // Handle wildcard
  if (field === "*") return true;

  // Handle lists (comma-separated values)
  if (field.includes(",")) {
    return field.split(",").every(part => validateCronField(part.trim(), min, max));
  }

  // Handle ranges (e.g., 1-5)
  if (field.includes("-")) {
    const [start, end] = field.split("-");
    const startNum = parseInt(start, 10);
    const endNum = parseInt(end, 10);
    if (isNaN(startNum) || isNaN(endNum)) return false;
    return startNum >= min && startNum <= max && endNum >= min && endNum <= max && startNum <= endNum;
  }

  // Handle step values (e.g., */5 or 1-10/2)
  if (field.includes("/")) {
    const [base, step] = field.split("/");
    const stepNum = parseInt(step, 10);
    if (isNaN(stepNum) || stepNum <= 0) return false;
    if (base === "*") return true;
    return validateCronField(base, min, max);
  }

  // Handle single number
  const num = parseInt(field, 10);
  if (isNaN(num)) return false;
  return num >= min && num <= max;
}

/**
 * Validate a cron expression
 * Format: minute hour day-of-month month day-of-week
 */
export function validateCronExpr(expr: string): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  // Check each part has valid characters
  if (!parts.every((p) => CRON_FIELD_RE.test(p))) return false;

  // Validate ranges: minute(0-59), hour(0-23), dom(1-31), month(1-12), dow(0-6)
  const ranges = [
    [0, 59],   // minute
    [0, 23],   // hour
    [1, 31],   // day of month
    [1, 12],   // month
    [0, 6],    // day of week (0=Sunday, 6=Saturday)
  ];

  return parts.every((part, i) => {
    const [min, max] = ranges[i];
    return validateCronField(part, min, max);
  });
}

interface StoredCronJob {
  id: string;
  cron: string;
  task: string;
  skill_name?: string;
  provider: string;
  model?: string;
  base_url?: string;
  created_at: string;
  last_run: string | null;
  last_result: string | null;
  enabled: boolean;
  notify?: string;
}

interface ResultEntry {
  job_id: string;
  task: string;
  result: string;
  timestamp: string;
}

const _listJobsCache = new Map<string, { ts: number; jobs: StoredCronJob[] }>();
const CACHE_TTL = 30_000;

export class CronManager {
  private jobsDir: string;
  private resultsFile: string;
  private _dirEnsured = false;

  constructor(cronDir?: string) {
    const config = getConfig();
    this.jobsDir = cronDir ?? config.cronDir;
    this.resultsFile = join(this.jobsDir, "results.jsonl");
  }

  private ensureDir(): void {
    if (this._dirEnsured) return;
    mkdirSync(this.jobsDir, { recursive: true });
    this._dirEnsured = true;
  }

  private jobPath(jobId: string): string {
    if (!JOB_ID_RE.test(jobId)) throw new Error(`Invalid job ID: '${jobId}'`);
    return join(this.jobsDir, `${jobId}.json`);
  }

  addJob(
    cronExpr: string,
    task: string,
    skillName?: string,
    provider?: string,
    model?: string,
    baseUrl?: string,
    notify?: string,
  ): string {
    this.ensureDir();
    const jobId = crypto.randomBytes(6).toString("hex").slice(0, 12);
    const job: StoredCronJob = {
      id: jobId,
      cron: cronExpr,
      task,
      skill_name: skillName,
      provider: provider ?? "openai",
      model,
      base_url: baseUrl,
      created_at: new Date().toISOString(),
      last_run: null,
      last_result: null,
      enabled: true,
      notify,
    };
    writeFileSync(this.jobPath(jobId), JSON.stringify(job, null, 2));
    _listJobsCache.delete(this.jobsDir);
    logger.info({ job_id: jobId, cron: cronExpr, task }, "cron_job_added");
    return jobId;
  }

  getJob(jobId: string): StoredCronJob | null {
    try {
      const path = this.jobPath(jobId);
      if (existsSync(path)) {
        return JSON.parse(readFileSync(path, "utf-8"));
      }
    } catch {
      // invalid ID
    }

    if (!existsSync(this.jobsDir)) return null;
    for (const name of readdirSync(this.jobsDir)) {
      if (!name.endsWith(".json")) continue;
      const stem = name.slice(0, -5);
      if (JOB_ID_RE.test(stem) && stem.startsWith(jobId)) {
        return JSON.parse(readFileSync(join(this.jobsDir, name), "utf-8"));
      }
    }
    return null;
  }

  listJobs(): StoredCronJob[] {
    this.ensureDir();
    const now = Date.now();
    const cached = _listJobsCache.get(this.jobsDir);
    if (cached && now - cached.ts < CACHE_TTL) return cached.jobs;

    if (!existsSync(this.jobsDir)) return [];

    const jobs: StoredCronJob[] = [];
    for (const name of readdirSync(this.jobsDir).sort()) {
      if (!name.endsWith(".json")) continue;
      const data = JSON.parse(
        readFileSync(join(this.jobsDir, name), "utf-8"),
      );
      if (!data.id) data.id = name.slice(0, -5);
      jobs.push(data);
    }
    _listJobsCache.set(this.jobsDir, { ts: now, jobs });
    return jobs;
  }

  removeJob(jobId: string): boolean {
    try {
      const path = this.jobPath(jobId);
      if (existsSync(path)) {
        unlinkSync(path);
        _listJobsCache.delete(this.jobsDir);
        logger.info({ job_id: jobId }, "cron_job_removed");
        return true;
      }
    } catch {
      // invalid ID
    }

    if (!existsSync(this.jobsDir)) return false;
    for (const name of readdirSync(this.jobsDir)) {
      if (!name.endsWith(".json")) continue;
      const stem = name.slice(0, -5);
      if (JOB_ID_RE.test(stem) && stem.startsWith(jobId)) {
        unlinkSync(join(this.jobsDir, name));
        _listJobsCache.delete(this.jobsDir);
        logger.info({ job_id: stem }, "cron_job_removed");
        return true;
      }
    }
    return false;
  }

  updateJobResult(jobId: string, result: string): void {
    const job = this.getJob(jobId);
    if (!job) return;
    job.last_run = new Date().toISOString();
    job.last_result = result.slice(0, 500);
    writeFileSync(this.jobPath(job.id), JSON.stringify(job, null, 2));
    _listJobsCache.delete(this.jobsDir);
    this.appendResultHistory(jobId, job.task ?? "", result);
  }

  getResults(
    jobId?: string,
    taskFilter?: string,
    limit?: number,
  ): Array<Record<string, unknown>> {
    let entries: ResultEntry[] = this.readAllResults();
    if (jobId) entries = entries.filter((e) => e.job_id === jobId);
    if (taskFilter) {
      const kw = taskFilter.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.task.toLowerCase().includes(kw) ||
          e.result.toLowerCase().includes(kw),
      );
    }
    entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return entries.slice(0, limit ?? 5) as unknown as Array<Record<string, unknown>>;
  }

  private appendResultHistory(jobId: string, task: string, result: string): void {
    mkdirSync(this.jobsDir, { recursive: true });
    const config = getConfig();
    const entry: ResultEntry = {
      job_id: jobId,
      task,
      result: result.slice(0, config.maxResultChars),
      timestamp: new Date().toISOString(),
    };
    appendFileSync(this.resultsFile, JSON.stringify(entry) + "\n");
    this.trimResultHistory(jobId);
  }

  private trimResultHistory(jobId: string): void {
    if (!existsSync(this.resultsFile)) return;
    const config = getConfig();
    const entries = this.readAllResults();
    const jobEntries = entries.filter((e) => e.job_id === jobId);
    if (jobEntries.length <= config.maxResultsPerJob) return;

    const keepTimestamps = new Set(
      jobEntries.slice(-config.maxResultsPerJob).map((e) => e.timestamp),
    );
    const others = entries.filter((e) => e.job_id !== jobId);
    const kept = jobEntries.filter((e) => keepTimestamps.has(e.timestamp));
    const all = [...others, ...kept].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    );
    writeFileSync(
      this.resultsFile,
      all.map((e) => JSON.stringify(e)).join("\n") + (all.length ? "\n" : ""),
    );
  }

  private readAllResults(): ResultEntry[] {
    if (!existsSync(this.resultsFile)) return [];
    const entries: ResultEntry[] = [];
    for (const line of readFileSync(this.resultsFile, "utf-8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        entries.push(JSON.parse(trimmed));
      } catch {
        // skip malformed
      }
    }
    return entries;
  }
}

export class CronScheduler {
  private tasks: ScheduledTask[] = [];
  private manager = new CronManager();
  private running = false;

  start(): void {
    this.loadJobs();
    this.running = true;
    logger.info("scheduler_started");
  }

  stop(): void {
    for (const t of this.tasks) t.stop();
    this.tasks = [];
    this.running = false;
    logger.info("scheduler_stopped");
  }

  reload(): void {
    for (const t of this.tasks) t.stop();
    this.tasks = [];
    _listJobsCache.delete((this.manager as unknown as { jobsDir: string }).jobsDir);
    this.loadJobs();
    logger.info("scheduler_reloaded");
  }

  private loadJobs(): void {
    const jobs = this.manager.listJobs();
    let loaded = 0;
    for (const job of jobs) {
      if (!job.enabled) continue;
      if (!validateCronExpr(job.cron)) {
        logger.warn({ job_id: job.id, cron: job.cron }, "invalid_cron");
        continue;
      }
      const task = cron.schedule(job.cron, () => {
        executeCronJob(job).catch((err: unknown) => {
          logger.error(
            { job_id: job.id, error: String(err) },
            "scheduled_task_failed",
          );
        });
      });
      this.tasks.push(task);
      loaded++;
    }
    logger.info({ total: jobs.length, loaded }, "cron_jobs_loaded");
  }
}

export async function executeCronJob(job: StoredCronJob): Promise<string> {
  logger.info({ job_id: job.id, task: job.task }, "cron_job_executing");
  const result = "stub: agent not yet implemented";
  const manager = new CronManager();
  manager.updateJobResult(job.id, result);
  logger.info({ job_id: job.id }, "cron_job_executed");
  return result;
}

export function registerHyMemoryConsolidation(intervalMinutes = 30): string {
  const config = getConfig();
  if (config.memorySystem !== "hy") {
    logger.info(
      { reason: `System is ${config.memorySystem}, not hy` },
      "hy_memory_consolidation_skipped",
    );
    return "";
  }

  const cronExpr = `*/${intervalMinutes} * * * *`;
  const manager = new CronManager();
  const jobId = manager.addJob(cronExpr, "hy_memory_consolidation");
  logger.info(
    { job_id: jobId, interval_minutes: intervalMinutes },
    "hy_memory_consolidation_registered",
  );
  return jobId;
}

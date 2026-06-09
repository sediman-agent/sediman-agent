import pino from "pino";
import { mkdirSync, statSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const LOG_DIR = join(homedir(), ".terminator", "logs");
const LOG_FILE = join(LOG_DIR, "sediman.log");
const MAX_BYTES = 10_000_000;

let _configured = false;
let _rootLogger: pino.Logger | null = null;

function truncateIfNeeded(): void {
  if (!existsSync(LOG_FILE)) return;
  try {
    const size = statSync(LOG_FILE).size;
    if (size > MAX_BYTES) unlinkSync(LOG_FILE);
  } catch {
    // ignore
  }
}

export function setupLogging(logLevel = "info", consoleEnabled = true): void {
  if (_configured) return;

  mkdirSync(LOG_DIR, { recursive: true });
  truncateIfNeeded();

  const targets: pino.TransportTargetOptions[] = [
    { target: "pino/file", options: { destination: LOG_FILE }, level: logLevel },
  ];

  // Only add console output if explicitly enabled (not in TUI mode)
  if (consoleEnabled && process.env.NODE_ENV !== "production") {
    targets.push({
      target: "pino-pretty",
      options: { colorize: true },
      level: logLevel,
    });
  }

  const transport = pino.transport({ targets });
  _rootLogger = pino({ level: logLevel }, transport);
  _configured = true;
}

export function createLogger(name: string): pino.Logger {
  if (!_configured) setupLogging();
  return _rootLogger!.child({ name });
}

const logger = new Proxy({} as pino.Logger, {
  get(_target, prop) {
    if (!_rootLogger) setupLogging();
    return Reflect.get(_rootLogger!, prop);
  },
});

export default logger;

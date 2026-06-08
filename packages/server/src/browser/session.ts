import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getConfig } from "../core/config";
import logger from "../core/logging";
import { buildStealthLaunchArgs } from "./stealth";

type Browser = import("playwright").Browser;
type BrowserContext = import("playwright").BrowserContext;
type Page = import("playwright").Page;

export class BrowserSession {
  headless: boolean;
  userDataDir: string;
  stealth: boolean;
  proxy?: string;
  fingerprintSeed?: number;

  private _browser: Browser | null = null;
  private _context: BrowserContext | null = null;
  private _started = false;
  onScreenshot?: (data: string) => void;

  constructor(opts?: {
    headless?: boolean;
    userDataDir?: string;
    stealth?: boolean;
    proxy?: string;
    fingerprintSeed?: number;
    onScreenshot?: (data: string) => void;
  }) {
    const cfg = getConfig();
    this.headless = opts?.headless ?? true;
    this.userDataDir =
      opts?.userDataDir ?? cfg.browserProfileDir;
    this.stealth = opts?.stealth ?? cfg.stealthEnabled;
    this.proxy = opts?.proxy ?? (cfg.stealthProxy || undefined);
    this.fingerprintSeed = opts?.fingerprintSeed;
    this.onScreenshot = opts?.onScreenshot;
  }

  get isStarted(): boolean {
    return this._started;
  }

  get isStealth(): boolean {
    return this.stealth;
  }

  get browser(): Browser | null {
    return this._browser;
  }

  get context(): BrowserContext | null {
    return this._context;
  }

  async start(): Promise<void> {
    if (this._started) return;

    const { chromium } = await import("playwright");

    mkdirSync(this.userDataDir, { recursive: true });

    const launchArgs = this.stealth
      ? buildStealthLaunchArgs({
          headless: this.headless,
          proxy: this.proxy,
        })
      : ["--no-first-run", "--no-default-browser-check"];

    if (this.headless && !this.stealth) {
      launchArgs.push("--headless=new");
    }

    this._context = await chromium.launchPersistentContext(this.userDataDir, {
      headless: this.headless,
      args: launchArgs,
      viewport: { width: 1280, height: 720 },
      ignoreDefaultArgs: ["--enable-automation"],
      userAgent: undefined,
    });

    this._browser = this._context.browser();

    if (this.stealth) {
      await this._context.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => false });
        const proto = (window as any).chrome || {};
        proto.runtime = proto.runtime || {};
        (window as any).chrome = proto;
      });
    }

    this._started = true;
    logger.info("browser session started (stealth=%s)", this.stealth);
  }

  /**
   * Connect Playwright to an existing Electron webview via CDP.
   * The shared browser — agent and user see the same page.
   */
  async connectViaCDP(wsUrl: string): Promise<void> {
    if (this._started) {
      await this.stop();
    }

    const { chromium } = await import("playwright");

    logger.info("connecting to CDP: %s", wsUrl.substring(0, 60) + "...");

    const browser = await chromium.connectOverCDP(wsUrl);

    const defaultContext = browser.contexts()[0];
    if (!defaultContext) {
      throw new Error("no browser context found at CDP endpoint");
    }

    this._browser = browser;
    this._context = defaultContext;
    this._started = true;

    logger.info("CDP connected (pages=%d)", defaultContext.pages().length);
  }

  async stop(): Promise<void> {
    if (!this._started) return;
    try {
      await this._context?.close();
    } catch {
      // ignore
    }
    this._context = null;
    this._browser = null;
    this._started = false;
    logger.info("browser session stopped");
  }

  async prewarm(): Promise<void> {
    await this.start();
  }

  async takeScreenshot(): Promise<string | null> {
    if (!this._context) return null;
    const page = this._context.pages()[0] || (await this._context.newPage());
    const buf = await page.screenshot({ type: "png" });
    const b64 = buf.toString("base64");
    this.onScreenshot?.(b64);
    return b64;
  }

  async saveState(name: string): Promise<void> {
    if (!this._context) throw new Error("browser not started");
    const state = await this._context.storageState();
    const dir = join(this.userDataDir, "states");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(state, null, 2));
    logger.info("saved browser state: %s", name);
  }

  async loadState(name: string): Promise<boolean> {
    const filePath = join(this.userDataDir, "states", `${name}.json`);
    if (!existsSync(filePath)) return false;
    if (!this._context) throw new Error("browser not started");
    const raw = readFileSync(filePath, "utf-8");
    const state = JSON.parse(raw);
    for (const cookie of state.cookies ?? []) {
      await this._context.addCookies([cookie]);
    }
    logger.info("loaded browser state: %s", name);
    return true;
  }
}

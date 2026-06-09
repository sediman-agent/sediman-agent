import * as Sentry from "@sentry/node";

let _initialized = false;

export function initSentry(): void {
  if (_initialized) return;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT ?? "production",
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
      profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? 0.1),
    });
    _initialized = true;
  } catch {
    // ignore
  }
}

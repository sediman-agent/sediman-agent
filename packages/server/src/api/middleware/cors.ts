import { cors } from "hono/cors";
import type { MiddlewareHandler } from "hono";

export function corsMiddleware(origins: string[]): MiddlewareHandler {
  return cors({
    origin: (origin) => {
      // Allow null origin (Electron file:// protocol) and configured origins
      if (!origin || origin === 'null') return origin || '*';
      if (origins.includes(origin)) return origin;
      return null;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
  });
}

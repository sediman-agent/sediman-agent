import type { MiddlewareHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { classifyError } from "../../core/errors";
import { addLog } from "../routes/logs";

export const errorHandler: MiddlewareHandler = async (c, next) => {
  try {
    await next();
  } catch (err) {
    const info = classifyError(err);
    const status = mapCodeToStatus(info.code) as ContentfulStatusCode;
    addLog("error", `${info.code}: ${info.message}`, "api");
    return c.json({ error: info.code, message: info.message, suggestion: info.suggestion }, status);
  }
};

function mapCodeToStatus(code: string): number {
  switch (code) {
    case "AUTH_ERROR":
      return 401;
    case "RATE_LIMIT":
      return 429;
    case "NOT_FOUND":
    case "SKILL_ERROR":
      return 404;
    case "CONFIG_ERROR":
    case "VALIDATION_ERROR":
      return 400;
    default:
      return 500;
  }
}

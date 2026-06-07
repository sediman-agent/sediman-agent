import { Hono } from "hono";
import { PROVIDERS, listProvidersWithAuth, createProvider } from "../../llm/provider";
import { setKey, getKey } from "../../core/auth";
import type { ApiDeps } from "../app";

export function createModelRoutes(deps: ApiDeps): Hono {
  const router = new Hono();

  router.post("/switch", async (c) => {
    const body = await c.req.json<{
      provider: string;
      model?: string;
      base_url?: string;
      api_key?: string;
    }>();
    if (!body.provider?.trim()) {
      return c.json(
        { error: "VALIDATION_ERROR", message: "provider is required" },
        400,
      );
    }

    const preset = PROVIDERS[body.provider];
    if (!preset) {
      return c.json(
        { error: "NOT_FOUND", message: `provider '${body.provider}' not found` },
        404,
      );
    }

    const resolvedModel = body.model ?? preset.model;
    const resolvedBaseUrl = body.base_url ?? preset.base_url;
    let apiKey = body.api_key;

    // If no API key provided in request, try to get from saved storage or env
    if (!apiKey && preset.api_key_env) {
      // First check saved storage
      const savedKey = await getKey(body.provider);
      if (savedKey) {
        apiKey = savedKey;
      } else {
        // Fall back to environment variable
        apiKey = process.env[preset.api_key_env];
      }
    }

    // Save the API key if provided
    if (apiKey && preset.api_key_env) {
      try {
        await setKey(body.provider, apiKey);
      } catch (err) {
        console.error("Failed to save API key:", err);
      }
    }

    // Create new provider instance
    let newProvider;
    try {
      newProvider = createProvider(body.provider, resolvedModel, resolvedBaseUrl, apiKey);
    } catch (err) {
      return c.json(
        { error: "PROVIDER_ERROR", message: `Failed to create provider: ${(err as Error).message}` },
        500,
      );
    }

    // Update the agent loop's provider
    if (deps.agentLoop) {
      deps.agentLoop.setLLMProvider(newProvider);
    }

    // Also update the shared llmProvider reference
    deps.llmProvider = newProvider;

    return c.json({
      provider: body.provider,
      model: resolvedModel,
      base_url: resolvedBaseUrl || null,
    });
  });

  router.get("/list", async (c) => {
    const providerParam = c.req.query("provider");

    if (providerParam) {
      const preset = PROVIDERS[providerParam];
      if (!preset) {
        return c.json(
          {
            error: "NOT_FOUND",
            message: `provider '${providerParam}' not found`,
          },
          404,
        );
      }
      return c.json({
        provider: providerParam,
        default_model: preset.model,
        base_url: preset.base_url || null,
        models: preset.extra_models.map((m) => ({
          id: m.id,
          name: m.name,
        })),
      });
    }

    const providers = await listProvidersWithAuth();
    const models: {
      provider: string;
      default_model: string;
      available: { id: string; name: string }[];
      has_key: boolean;
    }[] = [];

    for (const p of providers) {
      const preset = PROVIDERS[p.name];
      models.push({
        provider: p.name,
        default_model: p.default_model,
        available: (preset?.extra_models ?? []).map((m) => ({
          id: m.id,
          name: m.name,
        })),
        has_key: p.has_key,
      });
    }

    return c.json({ models });
  });

  router.get("/providers", async (c) => {
    const providers = await listProvidersWithAuth();
    return c.json({
      providers: providers.map((p) => {
        const preset = PROVIDERS[p.name];
        return {
          name: p.name,
          display_name: preset?.display_name ?? p.name,
          default_model: p.default_model,
          category: p.category,
          needs_api_key: p.needs_api_key,
          has_key: p.has_key,
          auto_detect: p.auto_detect,
        };
      }),
    });
  });

  return router;
}

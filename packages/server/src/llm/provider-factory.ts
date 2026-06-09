/**
 * LLM Provider Factory Module
 * Handles provider creation and registration
 */

import type { ToolDefinition, LLMResponse, ProviderInfo } from '../core/types';
import type { LLMProvider } from './provider';
import { OpenAICompatibleProvider } from './provider';
import { loadProviders } from './provider-loader';
import type { ProviderPreset } from './provider-loader';
import { hasKey, getKey } from '../core/auth';
import { createLogger } from '../core/logging';

const logger = createLogger('llm-provider-factory');

let _providers: Record<string, ProviderPreset> | null = null;

/**
 * Get all available providers
 */
export function getProviders(): Record<string, ProviderPreset> {
  if (!_providers) {
    _providers = loadProviders();
  }
  return _providers;
}

/**
 * Get a specific provider by name
 */
export function getProvider(name: string): ProviderPreset | undefined {
  return getProviders()[name];
}

/**
 * List all available providers
 */
export function listProviders(): ProviderInfo[] {
  const providers = getProviders();
  return Object.entries(providers).map(([name, preset]) => ({
    name,
    label: preset.label || name,
    models: preset.models || [],
    defaultModel: preset.defaultModel
  }));
}

/**
 * Create an LLM provider instance
 */
export function createProvider(
  providerName: string,
  modelName?: string,
  apiKey?: string
): LLMProvider {
  const providers = getProviders();
  const preset = providers[providerName];

  if (!preset) {
    throw new Error(`Unknown provider: ${providerName}`);
  }

  const model = modelName || preset.model || preset.defaultModel;
  const key = apiKey ?? (preset.api_key_env ? getKey(providerName) : undefined);

  // Create provider based on type (default to openai-compatible for now)
  const providerType = (preset as any).type || 'openai-compatible';
  const baseUrl = preset.base_url;

  switch (providerType) {
    case 'openai':
    case 'openai-compatible':
      return new OpenAICompatibleProvider(
        model,
        key,
        baseUrl
      );

    // Add more provider types as needed
    // case 'anthropic':
    //   return new AnthropicProvider(model, key);

    default:
      // Default to openai-compatible for unknown types
      return new OpenAICompatibleProvider(
        model,
        key,
        baseUrl
      );
  }
}

/**
 * Check if provider has API key configured
 */
export function hasProviderKey(providerName: string): boolean {
  const providers = getProviders();
  const preset = providers[providerName];

  if (!preset) {
    return false;
  }

  if (preset.authType === 'key') {
    return hasKey(providerName);
  }

  if (preset.authType === 'none') {
    return true;
  }

  return false;
}

/**
 * Get provider info for UI
 */
export function getProviderInfo(providerName: string): ProviderInfo | null {
  const providers = getProviders();
  const preset = providers[providerName];

  if (!preset) {
    return null;
  }

  return {
    name: providerName,
    label: preset.label || providerName,
    models: preset.models || [],
    defaultModel: preset.defaultModel
  };
}

/**
 * Validate provider configuration
 */
export function validateProviderConfig(providerName: string, modelName?: string): {
  valid: boolean;
  error?: string;
} {
  const providers = getProviders();
  const preset = providers[providerName];

  if (!preset) {
    return {
      valid: false,
      error: `Unknown provider: ${providerName}`
    };
  }

  // Check if provider has API key
  if (preset.authType === 'key' && !hasKey(providerName)) {
    return {
      valid: false,
      error: `No API key configured for ${providerName}`
    };
  }

  // Validate model name
  if (modelName) {
    const models = preset.models || [];
    if (models.length > 0 && !models.includes(modelName)) {
      return {
        valid: false,
        error: `Model ${modelName} not supported by ${providerName}`
      };
    }
  }

  return { valid: true };
}

/**
 * Provider proxy for convenient access
 */
export const PROVIDERS = new Proxy({} as Record<string, ProviderPreset>, {
  get(_, key) {
    return getProviders()[key as string];
  },
  has(_, key) {
    return key in getProviders();
  },
  ownKeys() {
    return Object.keys(getProviders());
  },
  getOwnPropertyDescriptor(_, key) {
    const providers = getProviders();
    return {
      enumerable: true,
      configurable: true,
      value: providers[key as string]
    };
  }
});

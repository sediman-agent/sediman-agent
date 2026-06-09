/**
 * Cache Manager Module
 * Handles schema and description caching for action tools
 */

import type { ActionDef } from './action-tool';
import { zodToJsonSchema } from './schema-utils';

/**
 * Generate unique key for caching
 */
export function generateCacheKey(...args: any[]): string {
  return args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(':');
}

/**
 * Schema cache for storing JSON schemas
 */
export class SchemaCache {
  private cache = new Map<string, Record<string, unknown>>();

  /**
   * Get schema from cache or compute and store
   */
  get(schema: { _def: any }, key: string): Record<string, unknown> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Compute and cache
    const jsonSchema = zodToJsonSchema(schema._def?.schema || schema);
    this.cache.set(key, jsonSchema);
    return jsonSchema;
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }
}

/**
 * Description cache for storing tool descriptions
 */
export class DescriptionCache {
  private cache = new Map<string, string>();

  /**
   * Get description from cache or compute and store
   */
  get(actions: readonly ActionDef[], key: string): string {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Compute description
    const description = actions.map(action => {
      const parts = [];
      parts.push(action.name);

      if (action.description) {
        parts.push(action.description);
      }

      // Add parameter info from schema
      const schema = action.schema;
      if (schema && schema instanceof Object) {
        const zodSchema = schema as any;
        const properties = zodSchema._def?.shape || {};
        const paramInfo = Object.keys(properties).map(key => {
          const param = properties[key];
          return `${key}`;
        }).join(', ');
        if (paramInfo) {
          parts.push(`Params: ${paramInfo}`);
        }
      }

      return parts.join(' | ');
    }).join('; ');

    this.cache.set(key, description);
    return description;
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }
}

/**
 * Global cache instances
 */
export const schemaCache = new SchemaCache();
export const descriptionCache = new DescriptionCache();

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  schemaCache.clear();
  descriptionCache.clear();
}

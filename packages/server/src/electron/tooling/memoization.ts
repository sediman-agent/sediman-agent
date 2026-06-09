/**
 * Memoization Module
 * Provides memoization utilities for expensive operations
 */

/**
 * Result type for better error handling (Functional programming pattern)
 */
export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * Memoization cache
 */
export class MemoCache<K, V> {
  private cache = new Map<K, V>();

  /**
   * Get value from cache or compute
   */
  get(key: K, compute: () => V): V {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const value = compute();
    this.cache.set(key, value);
    return value;
  }

  /**
   * Check if value is cached
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Set value in cache
   */
  set(key: K, value: V): void {
    this.cache.set(key, value);
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
 * Create a memoized function
 */
export function memoize<Args extends readonly unknown[], Return>(
  fn: (...args: Args) => Return,
  keyGenerator: (...args: Args) => string
): (...args: Args) => Return {
  const cache = new Map<string, Return>();

  return (...args: Args): Return => {
    const key = keyGenerator(...args);
    if (cache.has(key)) {
      return cache.get(key) as Return;
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Create a memoized function with custom cache
 */
export function memoizeWithCache<K, Args extends readonly unknown[], Return>(
  cache: MemoCache<K, Return>,
  keyGenerator: (...args: Args) => K,
  fn: (...args: Args) => Return
): (...args: Args) => Return {
  return (...args: Args): Return => {
    const key = keyGenerator(...args);
    if (cache.has(key)) {
      return cache.get(key, () => fn(...args));
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Create a memoized function that caches by first argument only
 */
export function memoizeByFirst<Args extends readonly unknown[], Return>(
  fn: (...args: Args) => Return
): (...args: Args) => Return {
  return memoize(fn, (...args: Args) => String(args[0]));
}

/**
 * Clear all caches
 */
const globalCaches: Set<MemoCache<any, any>> = new Set();

/**
 * Register a cache for global cleanup
 */
export function registerCache(cache: MemoCache<any, any>): void {
  globalCaches.add(cache);
}

/**
 * Clear all registered caches
 */
export function clearAllCaches(): void {
  const caches = Array.from(globalCaches);
  for (const cache of caches) {
    cache.clear();
  }
  globalCaches.clear();
}

/**
 * Check if result is success
 */
export function isSuccess<T>(result: Result<T>): result is { success: true; value: T } {
  return result.success === true;
}

/**
 * Check if result is failure
 */
export function isFailure<E>(result: Result<any, E>): result is { success: false; error: E } {
  return result.success === false;
}

/**
 * Unwrap result or throw error
 */
export function unwrap<T>(result: Result<T>): T {
  if (isSuccess(result)) {
    return result.value;
  }
  throw result.error;
}

/**
 * Unwrap result or return default
 */
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  if (isSuccess(result)) {
    return result.value;
  }
  return defaultValue;
}

/**
 * Wrap value in success result
 */
export function success<T>(value: T): Result<T> {
  return { success: true, value };
}

/**
 * Wrap error in failure result
 */
export function failure<E>(error: E): Result<any, E> {
  return { success: false, error };
}

/**
 * Try function and return result
 */
export async function tryResult<T, E = Error>(
  fn: () => Promise<T>
): Promise<Result<T, E>> {
  try {
    const value = await fn();
    return { success: true, value };
  } catch (error) {
    return { success: false, error: error as E };
  }
}

/**
 * Synchronous try-catch with result
 */
export function tryResultSync<T, E = Error>(
  fn: () => T
): Result<T, E> {
  try {
    const value = fn();
    return { success: true, value };
  } catch (error) {
    return { success: false, error: error as E };
  }
}

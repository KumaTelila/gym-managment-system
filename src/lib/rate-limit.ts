/**
 * In-memory sliding window rate limiter for Next.js API routes.
 * Suitable for single-instance, Docker, or edge/serverless container runtimes.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitRecord>();

// Periodically clean expired keys every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetAt <= now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Do not block process exit
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
}

/**
 * Check and increment rate limit for a specific key (e.g. IP + endpoint, or username).
 *
 * @param key Unique identifier for the rate limit bucket
 * @param maxAttempts Maximum allowed attempts within the window
 * @param windowMs Time window in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // default 15 minutes
): RateLimitResult {
  const now = Date.now();
  const record = store.get(key);

  if (!record || record.resetAt <= now) {
    // New or expired window
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      retryAfterSeconds: 0,
      resetAt: now + windowMs,
    };
  }

  if (record.count >= maxAttempts) {
    // Limit exceeded
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      resetAt: record.resetAt,
    };
  }

  // Increment within window
  record.count += 1;
  return {
    allowed: true,
    remaining: maxAttempts - record.count,
    retryAfterSeconds: 0,
    resetAt: record.resetAt,
  };
}

/**
 * Reset / clear rate limit for a key upon successful action (e.g. valid login)
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

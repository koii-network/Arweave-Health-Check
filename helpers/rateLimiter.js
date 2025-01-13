/**
 * Token bucket algorithm implementation for rate limiting
 */
class RateLimiter {
  constructor(tokensPerInterval, interval, maxBurst = null) {
    // Validate and sanitize inputs
    if (!Number.isInteger(tokensPerInterval) || tokensPerInterval <= 0) {
      throw new Error('tokensPerInterval must be a positive integer');
    }
    if (!Number.isInteger(interval) || interval <= 0) {
      throw new Error('interval must be a positive integer');
    }
    if (maxBurst !== null && (!Number.isInteger(maxBurst) || maxBurst < tokensPerInterval)) {
      throw new Error('maxBurst must be a positive integer greater than or equal to tokensPerInterval');
    }

    this.tokensPerInterval = tokensPerInterval;
    this.interval = interval;
    this.maxBurst = maxBurst || tokensPerInterval;
    this.tokenBuckets = new Map();
  }

  /**
   * Try to consume a token for a given key
   * @param {string} key - The key to rate limit on
   * @param {number} tokens - Number of tokens to consume (default: 1)
   * @returns {boolean} - Whether the request should be allowed
   */
  tryConsume(key, tokens = 1) {
    // Validate inputs
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error('key must be a non-empty string');
    }
    if (!Number.isInteger(tokens) || tokens <= 0) {
      throw new Error('tokens must be a positive integer');
    }

    const now = Date.now();
    let bucket = this.tokenBuckets.get(key);

    // Create new bucket if it doesn't exist
    if (!bucket) {
      bucket = {
        tokens: this.maxBurst,
        lastRefill: now
      };
      this.tokenBuckets.set(key, bucket);
    }

    // Calculate time passed and refill tokens
    const timePassed = Math.max(0, now - bucket.lastRefill);
    const tokensToAdd = Math.floor((timePassed / this.interval) * this.tokensPerInterval);

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(this.maxBurst, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    // Check if we have enough tokens
    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Get current token count for a key
   * @param {string} key - The key to check
   * @returns {number} - Current token count
   */
  getTokens(key) {
    // Validate input
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error('key must be a non-empty string');
    }

    const bucket = this.tokenBuckets.get(key);
    if (!bucket) {
      return this.maxBurst;
    }

    const now = Date.now();
    const timePassed = Math.max(0, now - bucket.lastRefill);
    const tokensToAdd = Math.floor((timePassed / this.interval) * this.tokensPerInterval);

    return Math.min(this.maxBurst, bucket.tokens + tokensToAdd);
  }

  /**
   * Reset rate limiter state for a key
   * @param {string} key - The key to reset
   */
  reset(key) {
    // Validate input
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error('key must be a non-empty string');
    }

    this.tokenBuckets.delete(key);
  }

  /**
   * Clear all rate limiter state
   */
  clear() {
    this.tokenBuckets.clear();
  }
}

module.exports = RateLimiter; 
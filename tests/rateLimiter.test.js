const RateLimiter = require('../helpers/rateLimiter');

describe('RateLimiter', () => {
  let rateLimiter;

  beforeEach(() => {
    jest.useFakeTimers();
    // 10 tokens per second
    rateLimiter = new RateLimiter(10, 1000, 10);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Rate Limiting', () => {
    test('should allow requests within rate limit', () => {
      const key = 'test-key';
      // Should allow 10 requests
      for (let i = 0; i < 10; i++) {
        expect(rateLimiter.tryConsume(key)).toBe(true);
      }
      // Should deny the 11th request
      expect(rateLimiter.tryConsume(key)).toBe(false);
    });

    test('should refill tokens over time', () => {
      const key = 'test-key';
      // Use all tokens
      for (let i = 0; i < 10; i++) {
        expect(rateLimiter.tryConsume(key)).toBe(true);
      }
      expect(rateLimiter.tryConsume(key)).toBe(false);

      // Advance time by 500ms (should refill 5 tokens)
      jest.advanceTimersByTime(500);
      
      // Should allow 5 requests
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.tryConsume(key)).toBe(true);
      }
      expect(rateLimiter.tryConsume(key)).toBe(false);
    });

    test('should handle multiple tokens per request', () => {
      const key = 'test-key';
      // Should allow 5 requests consuming 2 tokens each
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.tryConsume(key, 2)).toBe(true);
      }
      // Should deny the 6th request
      expect(rateLimiter.tryConsume(key, 2)).toBe(false);
    });
  });

  describe('Token Management', () => {
    test('should not exceed max burst size', () => {
      const key = 'test-key';
      // Use 5 tokens
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.tryConsume(key)).toBe(true);
      }

      // Wait for 2 seconds (should try to refill 20 tokens, but max is 10)
      jest.advanceTimersByTime(2000);

      // Should only allow 10 requests total
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.tryConsume(key)).toBe(true);
      }
      expect(rateLimiter.tryConsume(key)).toBe(false);
    });

    test('should reset bucket state', () => {
      const key = 'test-key';
      // Use all tokens
      for (let i = 0; i < 10; i++) {
        expect(rateLimiter.tryConsume(key)).toBe(true);
      }
      expect(rateLimiter.tryConsume(key)).toBe(false);

      // Reset bucket
      rateLimiter.reset(key);

      // Should allow 10 new requests
      for (let i = 0; i < 10; i++) {
        expect(rateLimiter.tryConsume(key)).toBe(true);
      }
    });

    test('should track token count accurately', () => {
      const key = 'test-key';
      expect(rateLimiter.getTokens(key)).toBe(10);

      // Use 5 tokens
      for (let i = 0; i < 5; i++) {
        rateLimiter.tryConsume(key);
      }
      expect(rateLimiter.getTokens(key)).toBe(5);

      // Wait for 500ms (should refill 5 tokens)
      jest.advanceTimersByTime(500);
      expect(rateLimiter.getTokens(key)).toBe(10);
    });
  });

  describe('Metrics', () => {
    test('should track request metrics', () => {
      const key = 'test-key';
      // Make 15 requests (10 should succeed, 5 should fail)
      for (let i = 0; i < 15; i++) {
        rateLimiter.tryConsume(key);
      }

      const metrics = rateLimiter.getMetrics();
      expect(metrics.totalRequests).toBe(15);
      expect(metrics.limitedRequests).toBe(5);
      expect(metrics.limitRate).toBeCloseTo(5/15);
    });

    test('should reset metrics', () => {
      const key = 'test-key';
      // Make some requests
      for (let i = 0; i < 5; i++) {
        rateLimiter.tryConsume(key);
      }

      rateLimiter.resetMetrics();
      const metrics = rateLimiter.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.limitedRequests).toBe(0);
      expect(metrics.limitRate).toBe(0);
    });

    test('should calculate requests per second', () => {
      const key = 'test-key';
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        rateLimiter.tryConsume(key);
      }

      // Advance time by 2 seconds
      jest.advanceTimersByTime(2000);

      const metrics = rateLimiter.getMetrics();
      expect(metrics.requestsPerSecond).toBeCloseTo(2.5); // 5 requests / 2 seconds
    });
  });
}); 
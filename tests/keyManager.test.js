// Mock namespaceWrapper before requiring keyManager
jest.mock('../namespaceWrapper', () => require('./mocks/namespaceWrapper.mock'));

const keyManager = require('../helpers/keyManager');

describe('KeyManager', () => {
  const testKeyName = 'test_api_key';
  const testKeyValue = 'test_secret_value_123';

  beforeEach(async () => {
    // Enable fake timers
    jest.useFakeTimers();
    // Reset the KeyManager state
    keyManager.cache.clear();
    keyManager.stats.clear();
    keyManager.logs.clear();
  });

  afterEach(() => {
    // Restore real timers
    jest.useRealTimers();
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Key Storage and Retrieval', () => {
    test('should store and retrieve a key', async () => {
      await keyManager.storeKey(testKeyName, testKeyValue);
      const retrievedKey = await keyManager.getKey(testKeyName);
      expect(retrievedKey).toBe(testKeyValue);
    });

    test('should handle non-existent keys', async () => {
      const retrievedKey = await keyManager.getKey('non_existent_key');
      expect(retrievedKey).toBeNull();
    });

    test('should respect key expiry', async () => {
      await keyManager.storeKey(testKeyName, testKeyValue, {
        expiry: Date.now() - 1000 // Already expired
      });
      const retrievedKey = await keyManager.getKey(testKeyName);
      expect(retrievedKey).toBeNull();
    });
  });

  describe('Key Rotation', () => {
    test('should rotate key when rotation period has passed', async () => {
      const rotationPeriod = 100; // 100ms for testing
      await keyManager.storeKey(testKeyName, testKeyValue, {
        rotationPeriod
      });

      // Advance time past rotation period
      jest.advanceTimersByTime(rotationPeriod + 10);

      const newKeyValue = 'new_secret_value_456';
      await keyManager.rotateKey(testKeyName, () => Promise.resolve(newKeyValue));
      const retrievedKey = await keyManager.getKey(testKeyName);
      expect(retrievedKey).toBe(newKeyValue);
    });

    test('should not rotate key before rotation period', async () => {
      const rotationPeriod = 1000; // 1 second
      await keyManager.storeKey(testKeyName, testKeyValue, {
        rotationPeriod
      });

      await keyManager.rotateKey(testKeyName, () => Promise.resolve('new_value'));
      const retrievedKey = await keyManager.getKey(testKeyName);
      expect(retrievedKey).toBe(testKeyValue);
    });
  });

  describe('Access Logging', () => {
    test('should log key access', async () => {
      await keyManager.storeKey(testKeyName, testKeyValue);
      await keyManager.getKey(testKeyName);
      
      const logs = await keyManager.getAccessLogs(testKeyName);
      expect(logs.length).toBe(2);
      expect(logs[0].operation).toBe('store');
      expect(logs[1].operation).toBe('storage_hit');
    });

    test('should maintain access statistics', async () => {
      await keyManager.storeKey(testKeyName, testKeyValue);
      await keyManager.getKey(testKeyName);
      await keyManager.getKey(testKeyName);

      const stats = await keyManager.getKeyStats(testKeyName);
      expect(stats.usageCount).toBe(3); // 1 store + 2 gets
      expect(stats.lastAccess).toBeDefined();
    });
  });

  describe('Key Deletion', () => {
    test('should delete keys', async () => {
      await keyManager.storeKey(testKeyName, testKeyValue);
      await keyManager.deleteKey(testKeyName);
      const retrievedKey = await keyManager.getKey(testKeyName);
      expect(retrievedKey).toBeNull();
    });

    test('should handle deletion of non-existent keys', async () => {
      const result = await keyManager.deleteKey('non_existent_key');
      expect(result).toBe(true);
    });
  });

  describe('Cache Behavior', () => {
    test('should use cache for repeated access', async () => {
      await keyManager.storeKey(testKeyName, testKeyValue);
      
      // First access - from storage
      await keyManager.getKey(testKeyName);
      
      // Second access - should be from cache
      await keyManager.getKey(testKeyName);
      
      const logs = await keyManager.getAccessLogs(testKeyName);
      expect(logs.length).toBe(3); // store + storage_hit + cache_hit
      expect(logs[0].operation).toBe('store');
      expect(logs[1].operation).toBe('storage_hit');
      expect(logs[2].operation).toBe('cache_hit');
    });

    test('should refresh cache after expiry', async () => {
      await keyManager.storeKey(testKeyName, testKeyValue);
      
      // First access
      await keyManager.getKey(testKeyName);
      
      // Wait for cache expiry (5 minutes in implementation)
      jest.advanceTimersByTime(6 * 60 * 1000);
      
      // Access after cache expiry
      await keyManager.getKey(testKeyName);
      
      const logs = await keyManager.getAccessLogs(testKeyName);
      expect(logs.length).toBe(3); // store + storage_hit + storage_hit
      expect(logs[0].operation).toBe('store');
      expect(logs[1].operation).toBe('storage_hit');
      expect(logs[2].operation).toBe('storage_hit');
    });
  });
}); 
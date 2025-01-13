const crypto = require('crypto');
const namespaceWrapper = require('../namespaceWrapper');

class KeyManager {
  constructor() {
    this.cache = new Map();
    this.stats = new Map();
    this.logs = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  async storeKey(keyName, keyValue, options = {}) {
    try {
      const keyData = {
        value: keyValue,
        expiry: options.expiry || null,
        rotationPeriod: options.rotationPeriod || null,
        lastRotation: Date.now(),
        checksum: this._generateChecksum(keyValue)
      };

      await namespaceWrapper.storeSet(keyName, JSON.stringify(keyData));
      this._logAccess(keyName, 'store');
      return true;
    } catch (error) {
      console.error(`Error storing key ${keyName}:`, error);
      return false;
    }
  }

  async getKey(keyName) {
    try {
      // Check cache first
      if (this.cache.has(keyName)) {
        const cached = this.cache.get(keyName);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          this._logAccess(keyName, 'cache_hit');
          return cached.value;
        }
        this.cache.delete(keyName);
      }

      // Get from storage
      const keyData = await namespaceWrapper.storeGet(keyName);
      if (!keyData) {
        this._logAccess(keyName, 'not_found');
        return null;
      }

      const parsedData = JSON.parse(keyData);
      
      // Check expiry
      if (parsedData.expiry && Date.now() > parsedData.expiry) {
        await this.deleteKey(keyName);
        this._logAccess(keyName, 'expired');
        return null;
      }

      // Update cache
      this.cache.set(keyName, {
        value: parsedData.value,
        timestamp: Date.now()
      });

      this._logAccess(keyName, 'storage_hit');
      return parsedData.value;
    } catch (error) {
      console.error(`Error retrieving key ${keyName}:`, error);
      return null;
    }
  }

  async rotateKey(keyName, newKeyGenerator) {
    try {
      const keyData = await namespaceWrapper.storeGet(keyName);
      if (!keyData) {
        return false;
      }

      const parsedData = JSON.parse(keyData);
      const timeSinceLastRotation = Date.now() - parsedData.lastRotation;

      if (!parsedData.rotationPeriod || timeSinceLastRotation < parsedData.rotationPeriod) {
        return false;
      }

      const newKeyValue = await newKeyGenerator();
      await this.storeKey(keyName, newKeyValue, {
        expiry: parsedData.expiry,
        rotationPeriod: parsedData.rotationPeriod
      });

      this._logAccess(keyName, 'rotated');
      return true;
    } catch (error) {
      console.error(`Error rotating key ${keyName}:`, error);
      return false;
    }
  }

  async deleteKey(keyName) {
    try {
      await namespaceWrapper.storeDelete(keyName);
      this.cache.delete(keyName);
      this._logAccess(keyName, 'deleted');
      return true;
    } catch (error) {
      console.error(`Error deleting key ${keyName}:`, error);
      return false;
    }
  }

  async getAccessLogs(keyName) {
    return this.logs.get(keyName) || [];
  }

  async getKeyStats(keyName) {
    const stats = this.stats.get(keyName) || { usageCount: 0, lastAccess: null };
    return { ...stats }; // Return a copy to prevent external modification
  }

  _generateChecksum(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  _logAccess(keyName, operation) {
    // Initialize logs array if it doesn't exist
    if (!this.logs.has(keyName)) {
      this.logs.set(keyName, []);
    }

    // Add new log entry
    const logEntry = {
      timestamp: Date.now(),
      operation
    };
    const logs = this.logs.get(keyName);
    logs.push(logEntry);

    // Keep only last 100 logs
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }

    // Initialize stats if they don't exist
    if (!this.stats.has(keyName)) {
      this.stats.set(keyName, { usageCount: 0, lastAccess: null });
    }

    // Update stats
    const stats = this.stats.get(keyName);
    if (operation !== 'deleted') {
      stats.usageCount++;
      stats.lastAccess = Date.now();
    } else {
      // Reset stats on deletion
      stats.usageCount = 0;
      stats.lastAccess = null;
    }
  }
}

module.exports = new KeyManager(); 
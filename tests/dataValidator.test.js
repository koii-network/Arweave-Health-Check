const DataValidator = require('../helpers/dataValidator');

describe('DataValidator', () => {
  describe('validatePreSubmission', () => {
    test('should validate correct data structure', () => {
      const validData = {
        healthyList: ['node1:8080', 'node2:8080'],
        totalNodes: 2
      };
      const result = DataValidator.validatePreSubmission(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data._checksum).toBeDefined();
    });

    test('should validate data with valid transaction IDs and node lists', () => {
      const validData = {
        healthyList: ['node1:8080', 'node2:8080'],
        totalNodes: 2,
        'bNyGJWXUE4nP9CqGXNXfreely8YpTJwzHxXrHnFXPXz': ['node1:8080', 'node2:8080'],
        'cMjGJWXUE4nP9CqGXNXfreely8YpTJwzHxXrHnFXPXz': 'Not Found'
      };
      const result = DataValidator.validatePreSubmission(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data._checksum).toBeDefined();
    });

    test('should reject invalid transaction ID format', () => {
      const invalidData = {
        healthyList: ['node1:8080'],
        totalNodes: 1,
        'invalid-tx-id': ['node1:8080']
      };
      const result = DataValidator.validatePreSubmission(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid transaction ID format: invalid-tx-id');
    });

    test('should reject invalid transaction data format', () => {
      const invalidData = {
        healthyList: ['node1:8080'],
        totalNodes: 1,
        'bNyGJWXUE4nP9CqGXNXfreely8YpTJwzHxXrHnFXPXz': 'invalid format'
      };
      const result = DataValidator.validatePreSubmission(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid data format for transaction');
    });

    test('should reject invalid data structure', () => {
      const invalidData = {
        healthyList: 'not an array',
        totalNodes: '2' // should be number
      };
      const result = DataValidator.validatePreSubmission(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject missing required fields', () => {
      const incompleteData = {
        healthyList: ['node1:8080']
      };
      const result = DataValidator.validatePreSubmission(incompleteData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: totalNodes');
    });

    test('should validate node URLs', () => {
      const dataWithInvalidUrls = {
        healthyList: ['invalid-url', 'node1:8080'],
        totalNodes: 2
      };
      const result = DataValidator.validatePreSubmission(dataWithInvalidUrls);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid node URL format');
    });
  });

  describe('Transaction ID Validation', () => {
    test('should validate correct transaction ID', () => {
      const validTxId = 'bNyGJWXUE4nP9CqGXNXfreely8YpTJwzHxXrHnFXPXz';
      expect(DataValidator.isValidTransactionId(validTxId)).toBe(true);
    });

    test('should reject transaction ID with invalid characters', () => {
      const invalidTxId = 'bNyGJWXUE4nP9CqGXNX$freely8YpTJwzHxXrHnFXPXz';
      expect(DataValidator.isValidTransactionId(invalidTxId)).toBe(false);
    });

    test('should reject transaction ID with incorrect length', () => {
      const shortTxId = 'bNyGJWXUE4nP9CqGXNXfreely8YpTJwzHxXrHnFX';
      const longTxId = 'bNyGJWXUE4nP9CqGXNXfreely8YpTJwzHxXrHnFXPXzX';
      expect(DataValidator.isValidTransactionId(shortTxId)).toBe(false);
      expect(DataValidator.isValidTransactionId(longTxId)).toBe(false);
    });

    test('should reject non-string inputs', () => {
      expect(DataValidator.isValidTransactionId(null)).toBe(false);
      expect(DataValidator.isValidTransactionId(undefined)).toBe(false);
      expect(DataValidator.isValidTransactionId(123)).toBe(false);
      expect(DataValidator.isValidTransactionId({})).toBe(false);
    });
  });

  describe('checksum verification', () => {
    test('should verify valid checksum', () => {
      const testData = {
        healthyList: ['node1:8080'],
        totalNodes: 1
      };
      const validatedData = DataValidator.validatePreSubmission(testData).data;
      expect(DataValidator.verifyChecksum(validatedData)).toBe(true);
    });

    test('should reject tampered data', () => {
      const testData = {
        healthyList: ['node1:8080'],
        totalNodes: 1
      };
      const validatedData = DataValidator.validatePreSubmission(testData).data;
      validatedData.healthyList.push('node2:8080');
      expect(DataValidator.verifyChecksum(validatedData)).toBe(false);
    });
  });

  describe('CID validation', () => {
    test('should validate correct CID', () => {
      const validCID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
      expect(DataValidator.isValidCID(validCID)).toBe(true);
    });

    test('should reject invalid CID', () => {
      const invalidCID = 'not-a-valid-cid';
      expect(DataValidator.isValidCID(invalidCID)).toBe(false);
    });
  });
}); 
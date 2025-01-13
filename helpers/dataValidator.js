const crypto = require('crypto');
const { CID } = require('multiformats/cid');

class DataValidator {
  // Schema for the healthyList data structure
  static healthyListSchema = {
    required: ['healthyList', 'totalNodes'],
    properties: {
      healthyList: {
        type: 'array',
        items: { type: 'string' }
      },
      totalNodes: { type: 'number' }
    }
  };

  /**
   * Validates data before IPFS submission
   * @param {Object} data - Data to validate
   * @returns {Object} - Validation result with status and errors
   */
  static validatePreSubmission(data) {
    const errors = [];
    
    try {
      // Check if data exists
      if (!data) {
        errors.push('No data provided for validation');
        return { isValid: false, errors };
      }

      // Validate data structure against schema
      const structureErrors = this.validateStructure(data);
      if (structureErrors.length > 0) {
        errors.push(...structureErrors);
      }

      // Validate node URLs in healthyList
      if (data.healthyList) {
        const urlErrors = this.validateNodeUrls(data.healthyList);
        if (urlErrors.length > 0) {
          errors.push(...urlErrors);
        }
      }

      // Validate transaction IDs if present
      const txIds = Object.keys(data).filter(key => 
        key !== 'healthyList' && 
        key !== 'totalNodes' && 
        !key.startsWith('_')
      );
      
      for (const txId of txIds) {
        if (!this.isValidTransactionId(txId)) {
          errors.push(`Invalid transaction ID format: ${txId}`);
        }
        // Validate transaction data format if it's an array of nodes
        if (Array.isArray(data[txId])) {
          const txUrlErrors = this.validateNodeUrls(data[txId]);
          if (txUrlErrors.length > 0) {
            errors.push(`Invalid node URLs for transaction ${txId}:`, ...txUrlErrors);
          }
        } else if (data[txId] !== 'Not Found') {
          errors.push(`Invalid data format for transaction ${txId}. Must be an array of nodes or 'Not Found'`);
        }
      }

      // Generate and attach checksum
      if (errors.length === 0) {
        data._checksum = this.generateChecksum(data);
      }

      return {
        isValid: errors.length === 0,
        errors,
        data: errors.length === 0 ? data : null
      };
    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
      return { isValid: false, errors };
    }
  }

  /**
   * Validates if a string is a valid Arweave transaction ID
   * @param {string} txId - Transaction ID to validate
   * @returns {boolean} - Whether the transaction ID is valid
   */
  static isValidTransactionId(txId) {
    if (!txId || typeof txId !== 'string') return false;
    
    // Transaction ID must be 43 characters
    if (txId.length !== 43) return false;
    
    // Must be base64url encoded (A-Z, a-z, 0-9, -, _)
    const base64urlPattern = /^[A-Za-z0-9_-]+$/;
    return base64urlPattern.test(txId);
  }

  /**
   * Validates data structure against schema
   * @param {Object} data - Data to validate
   * @returns {Array} - Array of validation errors
   */
  static validateStructure(data) {
    const errors = [];

    // Check required fields
    for (const field of this.healthyListSchema.required) {
      if (!(field in data)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate types
    if (data.healthyList && !Array.isArray(data.healthyList)) {
      errors.push('healthyList must be an array');
    }

    if (data.totalNodes && typeof data.totalNodes !== 'number') {
      errors.push('totalNodes must be a number');
    }

    return errors;
  }

  /**
   * Validates node URLs in healthyList
   * @param {Array} healthyList - List of node URLs to validate
   * @returns {Array} - Array of validation errors
   */
  static validateNodeUrls(healthyList) {
    const errors = [];
    const urlPattern = /^[a-zA-Z0-9.-]+:\d+$/;

    healthyList.forEach((node, index) => {
      if (!urlPattern.test(node)) {
        errors.push(`Invalid node URL format at index ${index}: ${node}`);
      }
    });

    return errors;
  }

  /**
   * Generates a checksum for data verification
   * @param {Object} data - Data to generate checksum for
   * @returns {string} - Generated checksum
   */
  static generateChecksum(data) {
    const dataString = JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Verifies data integrity using stored checksum
   * @param {Object} data - Data to verify
   * @returns {boolean} - Whether data is valid
   */
  static verifyChecksum(data) {
    if (!data || !data._checksum) {
      return false;
    }

    const storedChecksum = data._checksum;
    delete data._checksum;
    const calculatedChecksum = this.generateChecksum(data);
    data._checksum = storedChecksum;

    return storedChecksum === calculatedChecksum;
  }

  /**
   * Validates CID format
   * @param {string} cid - CID to validate
   * @returns {boolean} - Whether CID is valid
   */
  static isValidCID(cid) {
    try {
      CID.parse(cid);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = DataValidator; 
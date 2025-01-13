const storage = new Map();

const namespaceWrapper = {
  storeSet: jest.fn((key, value) => {
    storage.set(key, value);
    return Promise.resolve(true);
  }),

  storeGet: jest.fn((key) => {
    return Promise.resolve(storage.get(key));
  }),

  storeDelete: jest.fn((key) => {
    storage.delete(key);
    return Promise.resolve(true);
  }),

  // Mock other methods as needed
  getRpcUrl: jest.fn(() => Promise.resolve('http://localhost:8899')),
  getTaskLevelDBPath: jest.fn(() => Promise.resolve('./db')),
  initializeDB: jest.fn(() => Promise.resolve(true)),
};

module.exports = namespaceWrapper; 
# Arweave Health Check Task

## Overview
This repository contains a Koii Network task designed to monitor and validate the health of the Arweave network. The task runs on K2 nodes and performs two primary functions:
1. Monitoring Arweave network node health
2. Validating transactions across nodes

## Key Components

### Core Functionality
- **Core Logic** (`coreLogic.js`): Contains the main task execution logic
  - `arweave_task()`: Collects node health data and uploads to IPFS
  - `arweave_validate()`: Validates submissions and proofs from K2

### Data Management
- Uses `nedb` for local data storage
- Tracks pending and healthy node IDs
- Integrates with IPFS for data storage
- Uses Web3.storage for decentralized storage

### Security and Validation Mechanisms

#### Data Integrity Validation
- CID validation before data retrieval using `isValidCID()` function
- JSON structure verification for all retrieved data
- Multiple IPFS gateway fallbacks for data retrieval reliability
- Checksum verification through the Koii Storage SDK

#### API Key Protection
- Web3.storage keys stored in `.env` file (environment variables)
- Key access restricted through the KoiiStorageClient wrapper
- No direct exposure of keys in code or logs
- Access controlled through the namespaceWrapper interface

#### Node Access Control
- Node authentication using cryptographic signatures
- Public key verification for node submissions
- Node reputation tracking through submission history
- Validation of node participation through K2 infrastructure

#### Submission Proof Verification
- Cryptographic signature verification using `nacl.sign.detached.verify`
- Multi-step validation process for submissions:
  1. Node signature verification
  2. Peer verification
  3. Data structure validation
  4. Transaction existence verification
- Minimum 80% success rate required for validation

#### Round Completion Security
- Round-based submission tracking
- Audit triggers for suspicious activities
- Distribution list validation through multi-node consensus
- Anti-gaming mechanisms through node selection randomization
- Reward distribution protected by smart contract validation

### Infrastructure
- Built on Node.js
- Uses Koii Network's K2 infrastructure
- Integrates with Arweave and IPFS networks

## Setup and Execution

### Prerequisites
- Node.js environment
- Web3.storage API key
- Environment configuration (`.env` file)

### Installation
```bash
npm install
# or
yarn install
```

### Running the Task
```bash
npm run test
# or
yarn test
```

### Key Scripts
- `npm run go`: Main execution with logging
- `npm run test`: Run Jest tests
- `npm run test:api`: API testing
- `npm run unitTest`: Unit testing
- `npm start`: Start the application
- `npm run webpack`: Build the application

## Expected Performance

### Task Execution
1. Task runs in rounds on K2 nodes
2. Collects Arweave network health metrics
3. Uploads data to IPFS
4. Submits proofs to K2
5. Validates other nodes' submissions

### Success Criteria
- Successful node health checks
- Accurate transaction validation
- Proper IPFS data storage
- Valid submission proofs
- Successful round completion and reward distribution

### Dependencies
The task relies on several key packages:
- `@_koi/web3.js`: Koii Network integration
- `@_koii/create-task-cli`: Task creation tools
- `web3.storage`: Decentralized storage
- Various utility packages for API calls and data processing 
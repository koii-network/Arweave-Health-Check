<h1 align="center">
  <img src="https://raw.githubusercontent.com/koii-network/koii.X/main/.github/images/koii_logo.svg" width="224px"/><br/>
  Arweave Health Check Task
</h1>
<p align="center">
  <img src="https://img.shields.io/badge/JavaScript-007ACC?style=flat&logo=javascript&logoColor=white" alt="javascript" />&nbsp;
   <a href="https://discord.gg/koii" target="_blank"><img src="https://img.shields.io/badge/Discord-7289DA?style=flat&logo=discord&logoColor=white" alt="cli version" /></a>&nbsp;
   <a href="http://koii.network/" target="_blank"> <img src="https://img.shields.io/badge/made%20by-koii-blue" alt="made-by-koii" /></a>&nbsp;
</p>

## 📖 Overview

This task is a simple health check for Arweave that running on Koii.network K2 nodes. It will check the following:

- The health nodes on the Arweave network
- The health of the transaction on each nodes

It will return the number of all nodes and healthy nodes, then the data will upload to IPFS and return the CID.

## 📦 Install

```bash
npm install or yarn install
```

## 🚀 Usage

```bash
npm run test or yarn test
```

It will run the whole task and return the result.

## 📝 Main Functions

- coreLogic.js
  - arweave_task()
  - arweave_validate()
- data.js
    - addData()
    - getData()
- namespaceWrapper.js

### Core Logic

This is the main function that will run the whole task. It will call the `arweave_task()` function to get the data and upload to IPFS. Then in `fetchSubmission()` function, it will upload cid to K2 as the submission in a specific round. In next round it will call the `arweave_validate()` function to validate the data. If the data is valid, the task Vote is true, your submission will be in the distribution list and wait to get the reward.

#### arweave_task()

This function will get the data from Arweave and upload to IPFS. It will return the number of all nodes and healthy nodes, then the data will upload to IPFS and return the CID.

#### arweave_validate()

This function will validate the submission from K2, which contain proofs of node and CID from IPFS. It will return true if the data is valid. Otherwise, it will return false.

#### Data

This is the main database function. It use `nedb` to store the data. In database, it will have `pendingId` which is arweave nodes wait to be verified and `healthyID` which is the healthy nodes. It will also have the data from IPFS.

#### NamespaceWrapper

This is the main function to interact with task node. It provide several functions to interact with task node. For example:
    - namespaceWrapper.fs(). It use to wirte or read file if needed.
    - namespaceWrapper.storeGet(). It use to store data in database.
    - namespaceWrapper.getRound(). It use to get current round of task.

## Run and test

To run and test the whole task, please create a .env file and add the following:

```bash
SECRET_WEB3_STORAGE_KEY="<Your Web3.storage Key>"
```

If you do not have the key, please go to [web3.storage](https://web3.storage/) to get one.

Then run the following command:

```bash
npm run test or yarn test
```

To update the testing rules, please go to `tests/main.test.js`.
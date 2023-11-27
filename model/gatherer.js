// The Gatherer class provides a generic manager for a search and its results. It is designed to be used by the system/controller.js class. It is responsible for managing the search queue, saving the search and its results to the database, and requires an adapter.

// The adapter must be specified on creation of the gatherer, and must implement the following methods:
// 1. negotiateSession() - negotiates a session with the API
// 2. checkSession() - checks if the session is valid
// 3. newSearch(query) - fetches a new search from the API
// 4. parseOne(item) - parses a single item from the API into a format that can be used by the rest of the system
// 5. parseList(list) - parses a list of items from the API into a format that can be used by the rest of the system

// The gatherer must be instantiated with options.query which can be a list of keywords or a more custom filter object for the specific adapter in use

require('dotenv').config();
const Peer = require('../adapters/arweave/peer');
const { Web3Storage, getFilesFromPath, File } = require('web3.storage');
const { getRandomTransactionId } = require('../helpers/randomTx');
const { SpheronClient, ProtocolEnum } = require('@spheron/storage');
const storageClient = new SpheronClient({
  token: process.env.SPHERON_WEB3_STORAGE_KEY,
  apiUrl: 'https://temp-api-dev.spheron.network',
});
const { Queue } = require('async-await-queue');
const { namespaceWrapper } = require('../namespaceWrapper');

class Gatherer {
  constructor(db, adapter, options, round) {
    console.log('creating new adapter', db.name, adapter.txId, options);
    this.db = db;
    this.maxRetry = options.maxRetry;
    this.options = options;
    this.adapter = adapter;
    this.batchSize = options.batchSize | 10;
    this.pending = [];
    this.running = [];
    this.queried = [];
    this.healthyNodes = [];
    this.replicators = [];
    this.newFound = 0;
    this.queue = []; // the list of items the task_queue will execute asynchronously
    this.task_queue = new Queue(200, 100); // no more than 100 tasks at a time, 100ms delay between sequential tasks
    this.txId = adapter.txId;
    this.print = null;
    this.round = round;
  }

  gather = async limit => {
    // I. Startup
    // 1. Fetch an initial list of items using the query provided
    let startupList = await this.adapter.newSearch(this.options.query);
    let startupItems = await this.adapter.storeListAsPendingItems(startupList);

    // 2. Save the items to the database with the 'pending' prefix
    // 3. Fetch the next page of items using the query provided

    // the following flags are for debug use only
    let exit = false;
    let blue = true;

    while (blue) {
      let nextPage = await this.adapter.getNextPage(); // Null in Arweave
      if (nextPage) {
        if (this.options.nextLimit) {
          if (nextPage.length > this.options.nextLimit) {
            nextPage = nextPage.slice(0, this.options.nextLimit);
            exit = true;
          }
        }
        let nextItems = await this.adapter.storeListAsPendingItems(nextPage);
      } else {
        break;
      }
      if (exit) {
        break;
      }
      blue = false;
    }

    // II . Main Loop
    // 4. If no next page exists, or the options.nextLimit flag is used, use the list of items to find a second tier of items that are connected to each item found in the first list
    // 5. Save the second tier of items to the database with the 'pending' prefix
    // 6. Fetch the next page of items using the query provided
    // 7. Repeat steps 4-6 until the limit is reached or there are no more pages to fetch
    console.log('startup txid: ', this.txId);
    await this.db.getPendingList().then(async pendingList => {
      if (pendingList) {
        console.log('start up pending list', pendingList);
        await this.addNodes(pendingList);
      } else {
        console.log('no pending list found');
      }
    });

    let red = true;
    this.startPrinting();
    while (red) {
      try {
        console.log('pending', this.pending.length);
        if (this.pending.length > 0) {
          for (const peer of this.pending) {
            this.queue.push(
              this.task_queue
                .run(() => this.addBatch())
                .catch(e => console.error(e)),
            );
          }

          await Promise.allSettled(this.queue);
        } else {
          console.log('queue empty');
          red = false;
        }
      } catch (err) {
        console.error('error processing a node', err);
        break;
      }
    }

    // III. Diagnostics
    // 8. Return live asynchronous updates of the items being saved to the database
    let oldHealthyNodes = await this.db.getHealthyList();
    // let oldHealthyNodes = [
    //   "135.181.137.241:1984",
    //   "206.189.70.139:1984",
    //   "35.78.175.38:1984",
    //   "188.166.192.169:1984",
    //   "216.66.68.20:1984",
    //   "82.135.124.93:1984",
    //   "59.124.202.196:1984",
    //   "65.21.204.231:1984",
    //   "95.217.87.210:1984",
    //   "117.175.178.149:1984",
    //   "220.93.93.86:1984",
    //   "81.7.15.172:1984",
    //   "52.195.0.107:1984",
    //   "121.179.79.7:1984",
    //   "3.34.96.164:1984",
    //   "114.55.146.211:1984",
    //   "203.184.214.226:1984",
    //   "65.21.201.96:1984",
    //   "157.230.2.154:1984",
    //   "178.128.89.236:1984",
    //   "159.69.65.150:1984",
    //   "157.230.102.219:1984",
    //   "138.197.232.192:1984",
    //   "206.83.144.16:1984",
    //   "176.9.24.56:1984",
    //   "121.133.147.61:1984",
    //   "212.25.52.23:10019",
    //   "23.162.112.251:1984",
    //   "69.194.1.66:1984",
    //   "95.216.19.227:1984",
    //   "139.59.51.59:1984",
    //   "220.93.93.86:1985",
    //   "23.88.65.188:1984",
    //   "188.166.200.45:1984",
    //   "206.83.144.17:1984",
    //   "162.195.152.107:1984",
    //   "162.220.53.21:1984",
    //   "101.70.226.192:1984",
    //   "142.132.129.96:1984",
    //   "164.128.161.197:1984",
    //   "178.62.222.154:1984",
    //   "69.197.157.250:1984",
    //   "94.19.6.232:1984",
    //   "3.36.250.149:1984",
    //   "148.251.135.52:1984",
    //   "18.143.34.211:1984",
    //   "163.47.11.64:1984",
    //   "65.21.73.167:1984",
    //   "206.83.144.15:1984",
    //   "139.59.19.218:1984",
    //   "13.215.88.109:1984"
    //   ];
    let healthyNodes = [];
    // let txList = [
    //   'C5O7sDrPAeIGHopFFW1UfNKTzJCvfh3lfUQtHqgJVh0', // transaction
    //   'vm9Rhu3CAprz5deglsVJu_dsoLvZsVAIs9Fn8WOruCY', // transaction
    //   'J8UZQeEud6QwXQkkQKLf3Wc8-7a5YBMqP96be3hkuUs', // NFT
    // ];
    let txList = await this.getRandomTxList();
    console.log('txList is ', txList);

    // double check the healthy nodes are still healthy
    let data = {
      totalNodes: this.newFound,
    };
    
    let healthyList = [];
    
    for (let tx of txList) {
      let currentTxHealthyNodes = [];
    
      for (let node of oldHealthyNodes) {
        const peerInstance = new Peer(node);
        let result = await peerInstance.fullScan(node, tx);
    
        if (result.isHealthy && result.containsTx) {
          if (!data[tx]) {
            data[tx] = []; // Initialize data[tx] as an array
          }
          data[tx].push(node);
          currentTxHealthyNodes.push(node);
        } else {
          // console.log('Found unhealthy transaction', tx, 'in node', node);
          await this.db.deleteItem(node);
        }
      }
    
      // If currentTxHealthyNodes is empty, set the value to 'Not Found'
      if (currentTxHealthyNodes.length === 0) {
        data[tx] = 'Not Found';
      }
    
      // On first iteration, initialize healthyList with currentTxHealthyNodes
      // On following iterations, find intersection of healthyList and currentTxHealthyNodes
      if (healthyList.length === 0) {
        healthyList = [...currentTxHealthyNodes];
      } else if (currentTxHealthyNodes.length !== 0) { // Only update healthyList if currentTxHealthyNodes is not empty
        healthyList = healthyList.filter(node => currentTxHealthyNodes.includes(node));
      }
    }
    
    data.healthyList = healthyList;
    
    console.log('Data:', data);

    const cid = await this.uploadIPFS(data);
    // IV. Auditing and Proofs
    // 9. Incrementally upload new items to IPFS and save the IPFS hash to the database (i.e. db.put('ipfs:' + item.id + ':data, ipfsHash)) for use in the rest apis
    healthyNodes.forEach(async peer => {
      // console.log ('peer', peer);
      await this.db.setIPFS(peer, cid);
    });

    return cid;
  };

  uploadIPFS = async function (data) {
    let path = `healthyList.json`;

    try {
      await namespaceWrapper.fs(
        'writeFile',
        path,
        JSON.stringify(data),
        err => {
          if (err) {
            console.error(err);
          }
        },
      );
    } catch (err) {
      console.log(err);
    }

    if (storageClient) {
      let cid;
      try {
        const basePath = await namespaceWrapper.getBasePath();
        let file = await getFilesFromPath(`${basePath}/${path}`);
        cid = await storageClient.upload(file, {
          protocol: ProtocolEnum.IPFS,
          name: 'test',
          onUploadInitiated: uploadId => {
            console.log(`Upload with id ${uploadId} started...`);
          },
          onChunkUploaded: (uploadedSize, totalSize) => {
            currentlyUploaded += uploadedSize;
            console.log(`Uploaded ${currentlyUploaded} of ${totalSize} Bytes.`);
          },
        });
      
        console.log(`CID: ${cid}`);
        console.log('Arweave healthy list to IPFS: ', cid);
      } catch (err) {
        console.log('error uploading to IPFS, trying again');
        try {
          const uploadData = Buffer.from(JSON.stringify(data), 'utf8');
          let file = new File([uploadData], path, {
            type: 'application/json',
          });
          cid = await storageClient.upload(file, {
            protocol: ProtocolEnum.IPFS,
            name: 'test',
            onUploadInitiated: uploadId => {
              console.log(`Upload with id ${uploadId} started...`);
            },
            onChunkUploaded: (uploadedSize, totalSize) => {
              currentlyUploaded += uploadedSize;
              console.log(`Uploaded ${currentlyUploaded} of ${totalSize} Bytes.`);
            },
          });
          console.log('Arweave healthy list to IPFS: ', cid);
        } catch (err) {
          console.log(err);
        }
      }
      return cid;
    } else {
      console.log('NODE DO NOT HAVE ACCESS TO WEB3.STORAGE');
    }
    return cid;
  };

  addBatch = async function () {
    for (let i = 0; i < this.pending.length; i++) {
      // console.log(this.pending.length + ' left in pending list');
      return await this.processPending();
    }
  };

  processPending = async function () {
    // get a random node from the pending list
    if (this.pending.length > 0) {
      let item = await this.getRandomNode();
      if (typeof item !== 'string') item = JSON.stringify(item.location);

      const peerInstance = new Peer(item);

      let result = await peerInstance.fullScan(item, this.txId);
      // remove from pending
      let pendingId = `pending:arweaveNodes:${item}`;
      await this.db.deleteItem(pendingId);
      this.queried.push(item);
      // console.log(
      //   item,
      //   'healthy? ',
      //   result.isHealthy,
      //   'contains tx? ',
      //   result.containsTx,
      // );
      // this.printStatus();
      if (result.isHealthy) {
        for (let newPeer of result.peers) {
          if (typeof newPeer !== 'string') {
            await this.adapter.storeListAsPendingItems(newPeer);
            await this.addNodes(newPeer);
          } else {
            // console.log('received ', result.peers.length, ' peers');
            await this.adapter.storeListAsPendingItems(result.peers);
            await this.addNodes(result.peers);
            break;
          }
        }
      }

      if (result.containsTx) {
        await this.updateHealthy(item);

        // console.log(`Healthy node found at ${item} `);
        // await this.printStatus();
      }

      await this.removeFromRunning(item); // this function should take care of removing the old pending item and adding new pending items for the list from this item
      return item;
    } else {
      console.log('no more pending items');
      // this.printStatus();
      return;
    }
  };

  getRandomNode = async function () {
    try {
      let index = Math.floor(Math.random() * this.pending.length);
      let peer = this.pending[index];
      this.pending[index] = this.pending[this.pending.length - 1];
      this.pending.pop();
      this.running.push(peer);
      return peer;
    } catch (err) {
      console.log('error selecting random node', err);
      return;
    }
  };

  getRandomTxList = async function () {
    try {
      const txList = [];
      for (let i = 0; i < 10; i++) {
        const txId = await getRandomTransactionId();
        txList.push(txId);
      }
      console.log(txList);
      return txList;
    } catch (error) {
      console.error('Failed to get random transaction list:', error);
    }
  };

  removeFromRunning = async function (location) {
    let index = this.running.indexOf(element => element == location);
    this.running.splice(index, 1);
  };

  addNodes = async function (peers) {
    // console.log('======= adding new nodes! ========', peers)
    if (!peers || peers.length < 1)
      throw new Error('You must pass an array of peer objects');

    if (!Array.isArray(peers)) {
      // console.log('peers', peers);
      throw new Error('You must pass an array of peer objects');
    }

    peers.forEach(peerUrl => {
      // a bit sloppy, but add the peer if it's not already in either the pending or past lists
      if (
        !this.queried.includes(peerUrl) &&
        !this.pending.includes(peerUrl) &&
        !this.running.includes(peerUrl)
      ) {
        this.pending.push(peerUrl);
        this.newFound = this.newFound + 1;
      }
    });
  };

  updateHealthy = async function (peerLocation) {
    if (!this.healthyNodes.includes(peerLocation)) {
      this.healthyNodes.push(peerLocation);
      console.log('adding healthy node', peerLocation);
      this.db.addHealthyItem(peerLocation, peerLocation);
    }
  };

  addReplicator = async function (peerLocation) {
    if (!this.replicators.includes(peerLocation)) {
      this.replicators.push(peerLocation);
    }
    addToReplicators(peerLocation);
  };

  printStatus = async function () {
    console.log('=============================');
    console.log(`\r\nResults: \r\n
                Healthy: ${this.healthyNodes.length} \r\n
                Queried: ${this.queried.length} \r\n
                Pending: ${this.pending.length}\r\n
                New Nodes Found: ${this.newFound}\r\n
                Running: ${this.running.length}\r\n
                In Queue: ${this.queue.length} 
            `);
    console.log('=============================');
  };

  printLoading = async function () {
    if (this.newFound === 0) {
      console.log('Loading status: 0%'); // to avoid division by zero
    } else if (this.pending.length === 0) {
      console.log('Loading status: 100%');
      console.log(
        'No more pending items, double check the healthy nodes are still healthy',
      );
      this.printStatus();
      this.stopPrinting();
    } else {
      let status =
        ((this.newFound - this.pending.length) / this.newFound) * 100;
      console.log(
        `Round ${this.round} Loading status: ${status.toFixed(2)}%...`,
      );
    }
  };

  startPrinting() {
    this.print = setInterval(() => {
      this.printLoading();
    }, 30000);
  }

  stopPrinting() {
    clearInterval(this.print);
  }

  getData(id) {
    return this.db.get(id);
  }

  getList(options) {
    return this.db.getList(options);
  }
}

module.exports = Gatherer;

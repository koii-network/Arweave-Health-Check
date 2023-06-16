// The Gatherer class provides a generic manager for a search and its results. It is designed to be used by the system/controller.js class. It is responsible for managing the search queue, saving the search and its results to the database, and requires an adapter.

// The adapter must be specified on creation of the gatherer, and must implement the following methods:
// 1. negotiateSession() - negotiates a session with the API
// 2. checkSession() - checks if the session is valid
// 3. newSearch(query) - fetches a new search from the API
// 4. parseOne(item) - parses a single item from the API into a format that can be used by the rest of the system
// 5. parseList(list) - parses a list of items from the API into a format that can be used by the rest of the system

// The gatherer must be instantiated with options.query which can be a list of keywords or a more custom filter object for the specific adapter in use

const Adapter = require('./adapter');
const Data = require('./data');
const Search = require('./search');
const Twitter = require('../adapters/twitter');
const Peer = require('../adapters/arweave/peer');
const { Web3Storage, getFilesFromPath } = require('web3.storage');
const storageClient = new Web3Storage({
  token: process.env.SECRET_WEB3_STORAGE_KEY,
});
const { Queue } = require('async-await-queue');
const { namespaceWrapper } = require('../namespaceWrapper');
const { TASK_ID } = require('../init');

class Gatherer {
  constructor(db, adapter, options) {
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
    this.task_queue = new Queue(5, 10000); // no more than 5 tasks at a time, 10000ms delay between sequential tasks
    this.txId = adapter.txId;
  }

  gather = async limit => {
    console.log('limit received', limit);

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

    let red = true;
    this.pending = await this.db.getPendingList(this.options.limit);
    while (red) {
      try {
        if (this.pending.length > 0) {
          // console.log('adding batch', this.pending.length);
          this.queue.push(
            this.task_queue.run(() =>
              this.addBatch(limit).catch(e => console.error(e)),
            ),
          );

          await Promise.allSettled(this.queue); // TODO fix batching as this will only resolve once all queued items have run, while we want to refill the batch as it is emptied
        } else {
          console.log('queue empty');
          // this.printStatus();
          break;
        }
      } catch (err) {
        console.error('error processing a node', err);
        break;
      }
      red = false;
    }

    // III. Diagnostics
    // 8. Return live asynchronous updates of the items being saved to the database
    let healthyNodes = await this.db.getHealthyList();
    if (healthyNodes) {
      console.log('healthy nodes', healthyNodes);
      const cid = await this.uploadIPFS(healthyNodes);
      // IV. Auditing and Proofs
      // 9. Incrementally upload new items to IPFS and save the IPFS hash to the database (i.e. db.put('ipfs:' + item.id + ':data, ipfsHash)) for use in the rest apis
      healthyNodes.forEach(async peer => {
        // console.log ('peer', peer);
        await this.db.setIPFS(peer, cid);
      });

      return cid;
      // TODO 11. Sign all IPFS payloads and save the signature to the database (i.e. db.put('ipfs:' + item.id + ':signature', ipfsHash)) for use in the rest apis
    } else {
      console.log('no healthy nodes found');
    }
  };

  uploadIPFS = async function (data) {
    let path = `healthyList.json`;

    try {
      const resp = await namespaceWrapper.fs('access', path);
      if (!resp.error) {
        console.log('healthy list file exists, appending');
        await namespaceWrapper.fs(
          'appendFile',
          path,
          JSON.stringify(data),
          function (err) {
            if (err) throw err;
          },
        );
      } else {
        console.log('creating healthy list file');
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
      }
    } catch (err) {
      console.log('creating healthy list file');
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
    }

    if (storageClient) {
      const basePath = await namespaceWrapper.getBasePath();
      let file = await getFilesFromPath(`${basePath}/${path}`);

      const cid = await storageClient.put(file);
      console.log('Arweave healthy list to IPFS: ', cid);

      return cid;
    } else {
      console.log('NODE DO NOT HAVE ACCESS TO WEB3.STORAGE');
    }
    return cid;
  };

  addBatch = async function (limit) {
    for (let i = 0; i < limit; i++) {
      console.log("process " + i + " of " + limit + " items")
      await this.processPending();
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
      this.queried.push(item.location);
      console.log(
        'healthy? ',
        result.isHealthy,
        'contains tx? ',
        result.containsTx,
      );
      if (result.isHealthy) {
        console.log('received ', result.peers.length, ' peers');
        await this.adapter.storeListAsPendingItems(result.peers);
      }

      if (result.containsTx) {
        await this.updateHealthy(item);

        console.log(`Healthy node found at ${item} `);
        await this.printStatus();
      }

      await this.removeFromRunning(item); // this function should take care of removing the old pending item and adding new pending items for the list from this item
    } else {
      console.log('no more pending items');
      this.printStatus();
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
        this.pending.push(new Peer(peerUrl));
        this.newFound = this.newFound + 1;
      }
    });
  };

  addToHealthy(nodeLocation) {
    namespaceWrapper.fs(
      'appendFile',
      `healthy.txt`,
      nodeLocation + ' ',
      function (err) {
        if (err) throw err;
      },
    );
  }

  updateHealthy = async function (peerLocation) {
    if (!this.healthyNodes.includes(peerLocation)) {
      this.healthyNodes.push(peerLocation);
      console.log('adding healthy node', peerLocation);
      this.db.addHealthyItem(peerLocation, peerLocation);
    }
    this.addToHealthy(peerLocation);
  };

  addReplicator = async function (peerLocation) {
    if (!this.replicators.includes(peerLocation)) {
      this.replicators.push(peerLocation);
    }
    addToReplicators(peerLocation);
  };

  printStatus = async function () {
    console.log(`\r\nResults: \r\n
                Healthy: ${this.healthyNodes.length} \r\n
                Queried: ${this.queried.length} \r\n
                Replications: ${this.replicators.length}\r\n
                Pending: ${this.pending.length}\r\n
                New Nodes Found: ${this.newFound}\r\n
                Running: ${this.running.length}\r\n
                In Queue: ${this.queue.length} 
            `);
  };

  // TODO - fix the methods below with proper db prefix mgmt
  // TODO then integrate them into the above flows to allow async queueing of reads from APIs and writes to the db
  getData(id) {
    return this.db.get(id);
  }

  getList(options) {
    return this.db.getList(options);
  }
}

module.exports = Gatherer;

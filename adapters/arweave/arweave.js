// TODO - produce map of arweave
// Import required modules
require('dotenv').config();
const axios = require('axios');
const Data = require(__dirname + '/../../model/data.js');
const Adapter = require(__dirname + '/../../model/adapter.js');

class Arweave extends Adapter {
  constructor(credentials, maxRetry, db, txId) {
    super(credentials, maxRetry, txId);
    this.credentials = credentials || {};
    this.maxRetry = maxRetry || 3;
    this.txId = txId;
    this.shims = {
      parseOne: async node => {
        // TODO - fetch one arweave node from the pending list, and see if it is online
        let healthCheck = await this.checkNode(node);

        // if it is online, then parse it and add it's peers to the pending list
        if (healthCheck) {
          this.parseNode(node);
        }
      },
      checkNode: async () => {
        // TODO check if the session is valid
      },
    };
    this.db = db;
  }

  getNextPage = async query => {
    // there is only 1000 results per page in this model, so we don't need to have a second page
    return null;
  };

  parseNode = async node => {
    let peers = await this.getPeers(node);

    let txCheck = await this.checkTx(this.txId);

    // TODO - add db updates here
    // 1. Remove from pending
    // 2. update db to reflect node status?

    return this;
  };

  getPeers = async node => {
    let peers = [];
    try {
      // console.log('sending PEER check for ', this.location)
      const payload = await superagent.get(`${node}/peers`).timeout({
        response: superagentdelays.peers.response,
        deadline: superagentdelays.peers.deadline,
      });
      // console.log('payload returned from ' + this.location, payload)
      const body = JSON.parse(payload.text);
      // console.log("BODY", body)
      if (body) {
        peers = body;
      }
      return;
    } catch (err) {
      console.log("can't fetch peers from " + this.location + ' ' + err);
    }
    return peers;
  };
  checkTx = async function (node, txId) {
    let containsTx = false;
    try {
      // console.log('sending txid check for ', peerUrl)
      const payload = await superagent.get(`${node}/${txId}`).timeout({
        response: superagentdelays.txfetch.response,
        deadline: superagentdelays.txfetch.deadline,
      });
      // console.log('payload returned from ' + peerUrl, payload)
      const body = JSON.parse(payload.text);
      containsTx = true;
    } catch (err) {
      // if (debug) console.error ("can't fetch " + this.location, err)
    }
    return containsTx;
  };

  negotiateSession = async () => {
    return true; // only leaving this here so it doesn't throw errors in gatherers
  };

  getNextPendingItem = async () => {
    return this.db.getPendingList(1);
  };

  checkNode = async () => {
    // TODO - need a clean way  to reintroduce this, for now it's wasting API credits
    this.session.isValid = true;
    return true;
  };

  getPendingItems() {
    return this.db.getPendingItems();
  }

  async storeListAsPendingItems(list) {
    // console.log('db', this.db)
    for (let node of list) {
      await this.db.addPendingItem(node, node);
    }
    return true;
  }

  newSearch = async query => {
    try {
      console.log('fetching peer list');
      let newNodes = [];
      let headers = {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537',
        },
      };
      let response = await axios.get('https://arweave.net/peers', headers);
      let peers = response.data;
      newNodes = peers;

      return newNodes;
    } catch (err) {
      console.log('ERROR IN SUBMIT DISTRIBUTION', err);
    }
  };
}
module.exports = Arweave;

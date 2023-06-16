const Gatherer = require('../model/gatherer');
const Arweave = require('../adapters/arweave/arweave');
const dataDb = require('../helpers/db');
// const { namespaceWrapper } = require('./namespaceWrapper');
const { Keypair } = require('@solana/web3.js'); // TEST For local testing only

const credentials = {}; // arweave doesn't need credentials

const run = async () => {
  // Load node's keypair from the JSON file
  // const keypair = await namespaceWrapper.getSubmitterAccount();

  // get Round
  // const round = await namespaceWrapper.getRound();

  // TEST ROUND
  let round = 1000;

  // TEST For local testing, hardcode the keypair
  const keypair = Keypair.generate();

  let query = 'web3'; // the query our twitter search will use

  let options = {
    maxRetry: 3,
    query: query,
  };


  await dataDb.intializeData();
  const adapter = new Arweave(
    credentials,
    options.maxRetry,
    dataDb,
    'txidhere',
  );

  const gatherer = new Gatherer(dataDb, adapter, options);

  // run a gatherer to get 100 items
  let result = await gatherer.gather(100);

  return result;

};

run();

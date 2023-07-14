const Gatherer = require('./model/gatherer');
const Arweave = require('./adapters/arweave/arweave');
const { namespaceWrapper } = require('./namespaceWrapper');
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const dataDb = require('./helpers/db');
const { Web3Storage, getFilesFromPath, File } = require('web3.storage');
const storageClient = new Web3Storage({
  token: process.env.SECRET_WEB3_STORAGE_KEY,
});
const { getRandomTransactionId } = require('./helpers/randomTx');

const credentials = {}; // arweave doesn't need credentials

const run = async round => {
  // Load node's keypair from the JSON file
  const keypair = await namespaceWrapper.getSubmitterAccount();

  let publicKeyHex = Buffer.from(keypair._keypair.publicKey).toString('hex');

  let query = 'web3'; // the query our twitter search will use

  let options = {
    maxRetry: 3,
    query: query,
  };

  let txid = await getRandomTransactionId();

  await dataDb.intializeData();
  const adapter = new Arweave(
    credentials,
    options.maxRetry,
    dataDb,
    txid,
  );

  const gatherer = new Gatherer(dataDb, adapter, options, round);

  // run a gatherer to get 10 items
  let result = await gatherer.gather(10);

  const messageUint8Array = new Uint8Array(Buffer.from(result));

  const signedMessage = nacl.sign(messageUint8Array, keypair.secretKey);
  const signature = signedMessage.slice(0, nacl.sign.signatureLength);

  const submission_value = {
    proofs: result,
    node_publicKey: publicKeyHex,
    node_signature: bs58.encode(signature),
  };

  const proof_cid = await uploadIPFS(submission_value, round);

  return proof_cid;
};

async function uploadIPFS(data, round) {
  let proofPath = `proofs${round}.json`;

  try {
    await namespaceWrapper.fs(
      'writeFile',
      proofPath,
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
    let proof_cid;
    try {
      const basePath = await namespaceWrapper.getBasePath();
      let file = await getFilesFromPath(`${basePath}/${proofPath}`);

      proof_cid = await storageClient.put(file);
      console.log(`Proofs of healthy list in round ${round} : `, proof_cid);
      try {
        await namespaceWrapper.fs('unlink', proofPath);
      } catch (err) {
        console.error(err);
      }
    } catch (err) {
      console.log('Error creating proof file, trying again');
      try {
        const uploadData = Buffer.from(JSON.stringify(data), 'utf8');
        let file = new File([uploadData], proofPath, {
          type: 'application/json',
        });

        proof_cid = await storageClient.put([file]);
        console.log(`Proofs of healthy list in round ${round} : `, proof_cid);
      } catch (err) {
        console.log(err);
      }
    }

    return proof_cid;
  } else {
    console.log('NODE DO NOT HAVE ACCESS TO WEB3.STORAGE');
  }
}

module.exports = run;

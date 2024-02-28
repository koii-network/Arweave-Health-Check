const Gatherer = require('./model/gatherer');
const Arweave = require('./adapters/arweave/arweave');
const { namespaceWrapper } = require('./namespaceWrapper');
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const dataDb = require('./helpers/db');
const { Web3Storage, getFilesFromPath, File } = require('web3.storage');
const { SpheronClient, ProtocolEnum } = require('@spheron/storage');
const storageClient = new SpheronClient({
  token: process.env.Spheron_Storage
});
const fs = require('fs');
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
  const adapter = new Arweave(credentials, options.maxRetry, dataDb, txid);

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

uploadIPFS = async function (data, round) {
  let proofPath = `proofs.json`;
  let basePath = '';
  try {
    basePath = await namespaceWrapper.getBasePath();
    fs.writeFileSync(`${basePath}/${proofPath}`, JSON.stringify(data));
  } catch (err) {
    console.log(err);
  }

  if (storageClient) {
    let proof_cid;
    try {
      // const basePath = await namespaceWrapper.getBasePath();
      // let file = await getFilesFromPath(`${basePath}/${path}`);
      console.log(`${basePath}/${proofPath}`);
      let spheronData = await storageClient.upload(`${basePath}/${proofPath}`, {
        protocol: ProtocolEnum.IPFS,
        name: 'test',
        onUploadInitiated: uploadId => {
          console.log(`Upload with id ${uploadId} started...`);
        },
        onChunkUploaded: (uploadedSize, totalSize) => {
          console.log(`Uploaded ${uploadedSize} of ${totalSize} Bytes.`);
        },
      });
      proof_cid = spheronData.cid;

      console.log(`CID: ${proof_cid}`);
      console.log('Arweave healthy list to IPFS: ', proof_cid);
      try {
        fs.unlinkSync(`${basePath}/${proofPath}`);
      } catch (err) {
        console.error(err);
      }
    } catch (err) {
      console.log('error uploading to IPFS, trying again', err);
    }
    return proof_cid;
  } else {
    console.log('NODE DO NOT HAVE ACCESS TO Spheron');
  }
  return proof_cid;
};

module.exports = run;

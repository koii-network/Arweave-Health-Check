const Gatherer = require('./model/gatherer');
const Arweave = require('./adapters/arweave/arweave');
const { namespaceWrapper } = require('@_koii/namespace-wrapper');
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const dataDb = require('./helpers/db');
const { KoiiStorageClient } = require('@_koii/storage-task-sdk');
const client = new KoiiStorageClient(undefined, undefined, false);

const fs = require('fs');
const { getRandomTransactionId } = require('./helpers/randomTx');

const credentials = {}; // arweave doesn't need credentials

const run = async round => {
  // Load node's keypair from the JSON file
  // const keypair = await namespaceWrapper.getSubmitterAccount();

  // let publicKeyHex = Buffer.from(keypair._keypair.publicKey).toString('hex');

  try {
    let query = 'web3'; // the query our twitter search will use

    let options = {
      maxRetry: 3,
      query: query,
    };

    let txid = await getRandomTransactionId();

    if (!txid) {
      console.error('Failed to get random transaction ID');
      return null;
    }

    await dataDb.intializeData();
    const adapter = new Arweave(credentials, options.maxRetry, dataDb, txid);

    const gatherer = new Gatherer(dataDb, adapter, options, round);

    // run a gatherer to get 10 items
    let result = await gatherer.gather(10);

    // const messageUint8Array = new Uint8Array(Buffer.from(result));

    // const signedMessage = nacl.sign(messageUint8Array, keypair.secretKey);
    // const signature = signedMessage.slice(0, nacl.sign.signatureLength);

    // const submission_value = {
    //   proofs: result,
    //   node_publicKey: publicKeyHex,
    // node_signature: bs58.encode(signature),
    // };

    // const proof_cid = await uploadIPFS(submission_value, round);

    return result;
  } catch (err) {
    console.error('Error running the gatherer:', err);
    return null;
  }
};

// uploadIPFS = async function (data, round) {
//   let proofPath = `proofs.json`;
//   let basePath = '';
//   try {
//     basePath = await namespaceWrapper.getBasePath();
//     fs.writeFileSync(`${basePath}/${proofPath}`, JSON.stringify(data));
//   } catch (err) {
//     console.log(err);
//   }
//   let attempts = 0;
//   let maxRetries = 3;
//   if (storageClient) {
//     while (attempts < maxRetries) {
//       let proof_cid;
//       try {
//         // const basePath = await namespaceWrapper.getBasePath();
//         // let file = await getFilesFromPath(`${basePath}/${path}`);
//         // console.log(`${basePath}/${proofPath}`);
//         const userStaking = await namespaceWrapper.getSubmitterAccount();
//         console.log(`Uploading ${basePath}/${proofPath}`);
//         const fileUploadResponse = await client.uploadFile(`${basePath}/${proofPath}`,userStaking);
//         console.log(`Uploaded ${basePath}/${proofPath}`);
//         try{
//           proof_cid = fileUploadResponse.cid;
//         }catch(err){
//           proof_cid = null;
//           console.log('error getting CID', err);
//         }

//         // console.log(`CID: ${proof_cid}`);
//         console.log('Arweave healthy list to IPFS: ', proof_cid);

//         try {
//           fs.unlinkSync(`${basePath}/${proofPath}`);
//         } catch (err) {
//           console.error(err);
//         }
//         return proof_cid;
//       } catch (err) {
//         console.log('error uploading to IPFS, trying again', err);
//         attempts++;
//         if (attempts < maxRetries) {
//           console.log(
//             `Waiting for 10 seconds before retrying... Attempt ${
//               attempts + 1
//             }/${maxRetries}`,
//           );
//           await new Promise(resolve => setTimeout(resolve, 10000)); // 10s delay
//         } else {
//           console.log('Max retries reached, exiting...');
//         }
//       }
//       break;
//     }
//   } else {
//     console.log('NODE DO NOT HAVE ACCESS TO KOII STORAGE');
//   }
// };

module.exports = run;

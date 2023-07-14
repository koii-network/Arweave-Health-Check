const dataFromCid = require('./helpers/dataFromCid');
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const { default: axios } = require('axios');

module.exports = async (submission_value, round) => {
  console.log('******/ Areawve Scrapping VALIDATION Task FUNCTION /******');
  try {
  const outputraw = await dataFromCid(submission_value);
  const output = outputraw.data;
  console.log('OUTPUT', output);

  // Check that the node who submitted the proofs is a valid staked node
  let isNode = await verifyNode(
    output.proofs,
    output.node_signature,
    output.node_publicKey,
  );
  console.log("Is the node's signature on the CID payload correct?", isNode);

  // check each item in the linktrees list and verify that the node is holding that payload, and the signature matches
  let isPeer = await verifyPeers(output.proofs);
  console.log('Are peers True?', isPeer);

  if (isNode == true && isPeer == true) return true; // if both are true, return true
  else return false; // if one of them is false, return false
  } catch (err) {
    console.log('ERROR IN ARWEAVE VALIDATION FUNCTION', err);
    return false;
  }
};

// verify the linktree signature by querying the other node to get it's copy of the linktree
async function verifyPeers(proofs) {
  const healthyListRAW = await dataFromCid(proofs);
  const healthyList = healthyListRAW.data.healthyList;
  if (!healthyList) {
    console.log('No data received from web3.storage');
    return false;
  } else if (healthyList == '[]') {
    console.log('No healthy list to verify');
    return true;
  }
  for (let i = 0; i < healthyList.length; i++) {
    let peer = healthyList[i];
    let url = `http://${peer}`;
    let headers = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537',
      }
    };
    let response;
    try {
    response = await axios.get(url, headers);
    } catch (err) {
      console.log('Error getting peer data', err);
      return false;
    }
    let peerData = response.data;
    if (peerData) {
      return true;
    } else {
      return false;
    }
  }
}

// verifies that a node's signature is valid, and rejects situations where CIDs from IPFS return no data or are not JSON
async function verifyNode(proofs, signature, publicKey) {
  if (!proofs || !signature || !publicKey) {
    console.log('No data received from web3.storage');
    return false;
  }

  try {
  const messageUint8Array = new Uint8Array(Buffer.from(proofs));
  const signatureUint8Array = bs58.decode(signature);
  const publicKeyUint8Array = new Uint8Array(Buffer.from(publicKey, 'hex'));

  // verify the node signature
  const isSignatureValid = await verifySignature(
    messageUint8Array,
    signatureUint8Array,
    publicKeyUint8Array,
  );

  return isSignatureValid;
  } catch (err) {
    console.log('Error in verifyNode function', err);
    return false;
  }
}

async function verifySignature(message, signature, publicKey) {
  return nacl.sign.detached.verify(message, signature, publicKey);
}

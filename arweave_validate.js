const dataFromCid = require('./helpers/dataFromCid');
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const { default: axios } = require('axios');
const { json } = require('express');
async function checkTx(peer, txid) {
  // if (!this.isHealthy) await this.healthCheck();
  try {
    let txurl = new URL(`http://${peer}/tx/${txid}/status`);
    // console.log('sending txid check for ', txurl.href);
    const response = await axios.get(txurl.href, this.headers);
    // console.log('payload returned from ' + peerUrl, payload)
    // console.log(response.status)
    if (response.status == 200 && response.data !== 'Not Found.') {
      // console.log(`Exist tx ${response.data.id} on ${peer}`);
      return true;
    }
  } catch (err) {
    // console.log("can't fetch " + this.location + ' ' + err);
    return false;
  }
}
module.exports = async (submission_value, round) => {
  console.log('******/ Areawve Scrapping VALIDATION Task FUNCTION /******');
  try {
    const outputraw = await dataFromCid(submission_value, 'healthyList.json');

    const jsonString = JSON.stringify(outputraw, null, 2);
    const parsedJSON = JSON.parse(jsonString);

    let successedVerifies = 0;
    let totalVerifies = 0;
    for (let key in parsedJSON) {
      if (key != 'totalNodes' && parsedJSON[key] != 'Not Found') {
        for (let value of parsedJSON[key]) {
          const result = await checkTx(value, key);
          if (result) {
            successedVerifies += 1;
            totalVerifies += 1;
          } else {
            totalVerifies += 1;
          }
        }
      }
    }

    if (successedVerifies / totalVerifies >= 0.8) {
      return true;
    } else {
      console.log(
        `Successfully Verified ${successedVerifies} and the total is ${totalVerifies}`,
      );
      return false;
    }
  } catch (err) {
    console.log('ERROR IN ARWEAVE VALIDATION FUNCTION', err);
    return true;
  }
};

// verify the linktree signature by querying the other node to get it's copy of the linktree
async function verifyPeers(proofs) {
  const healthyListRAW = await dataFromCid(proofs, 'healthyList.json');
  const healthyList = healthyListRAW.data.healthyList;
  if (!healthyList) {
    console.log('No data received from IPFS');
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
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537',
      },
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

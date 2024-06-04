const axios = require('axios');
const { CID } = require('multiformats/cid');

function isValidCID(cid) {
  try {
    CID.parse(cid);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = async (cid, fileName) => {
    const validateCID = isValidCID(cid)
    if (!validateCID) {
      console.log(`Invalid CID: ${cid}`);
      return null;
    }
    const urllist = [
      `https://${cid}.ipfs.w3s.link/${fileName}`
    ];
    try {
      const client = new KoiiStorageClient(undefined, undefined, false);
      const blob = await client.getFile(cid, fileName);
      const text = await blob.text(); // Convert Blob to text
      const data = JSON.parse(text); // Parse text to JSON
      return data;
    }  catch (error) {
      console.log(`Error fetching file from Koii IPFS: ${error.message}`);
    }
    for (const url of urllist) {
      console.log(`Trying URL: ${url}`);
      try {
        const response = await axios.get(url);
        if (response.status === 200) {
          return response.data;
        }
      } catch (error) {
      }
    }
    console.log("Attempted all IPFS sites failed");
    return null; 
};

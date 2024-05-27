const axios = require('axios');

module.exports = async (cid, fileName, maxRetries = 4, retryDelay = 3000) => {
  const urllist = [
    `https://${cid}.ipfs.4everland.io/${fileName}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}/${fileName}`,
    `https://${cid}.ipfs.dweb.link/${fileName}`,
  ];
  const {KoiiStorageClient} = require('@_koii/storage-task-sdk');
  const client = new KoiiStorageClient(undefined, undefined, true);
  try {
    const blob = await client.getFile(cid, fileName);
    const text = await blob.text(); // Convert Blob to text
    const data = JSON.parse(text); // Parse text to JSON
    return data;
  }  catch (error) {
    console.log(`Error fetching file from Koii IPFS: ${error.message}`);
  }
  console.log(urllist);
  for (const url of urllist) {
    console.log(`Trying URL: ${url}`);
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.get(url);
        if (response.status === 200) {
          return response;
        } else {
          // console.log(`Attempt ${attempt} at IPFS ${url}: status ${response.status}`);
        }
      } catch (error) {
        // console.log(`Attempt ${attempt} at IPFS ${url} failed: ${error.message}`);
        if (attempt < maxRetries) {
          await sleep(retryDelay);
        }
      }
    }
  }
  console.log("Attempted all IPFS sites failed");
  return false; 
};

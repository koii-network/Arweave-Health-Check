const axios = require('axios');

module.exports = async (cid, fileName, maxRetries = 4, retryDelay = 3000) => {
  const urllist = [
    `https://${cid}.ipfs.4everland.io/${fileName}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}/${fileName}`,
    `https://${cid}.ipfs.dweb.link/${fileName}`,
  ];
  const client = new KoiiStorageClient.default(undefined, undefined, true);
  try {
    const data = await client.getFile(cid, fileName);
    return data;
  } catch (error) {
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

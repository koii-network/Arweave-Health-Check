const axios = require('axios');

module.exports = async (cid, fileName) => {
  console.log('CID', cid);
  let headers = {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ',
    },
  };
  const retryDelay = 5000;
  const url = `https://${cid}.ipfs.sphn.link/${fileName}`;
  let maxRetries = 3;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await axios.get(url);
      if (response.status === 200) {
        return response;
      } else {
        // console.log(`Attempt loading IPFS ${attempt}: Received status ${response.status}`);
      }
    } catch (error) {
      console.log(`Attempt loading IPFS ${attempt} failed: ${error.message}`);
      if (attempt < maxRetries) {
        // console.log(`Waiting for ${retryDelay / 1000} seconds before retrying...`);
        await sleep(retryDelay);
      } else {
        return false; // Rethrow the last error
      }
    }
  }
};

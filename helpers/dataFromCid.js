const axios = require('axios');
const { SpheronClient } = require('@spheron/storage');
const storageClient = new SpheronClient({
  token: process.env.Spheron_Storage,
});

module.exports = async (cid) => {
  console.log("CID", cid);
  if (storageClient) {
    const res = await storageClient.getCIDStatus(cid);
    if (!res.pinStatus) {
      // voting false
      console.log("VOTE FALSE");

      console.log("SLASH VOTE DUE TO FAKE VALUE");
      //console.log("VOTE", vote);
      return false;
    } else {
      let headers = {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ",
        },
      };
     
      const url = `https://${res.pinStatus.cid}.ipfs.w3s.link/proofs.json`;
      console.log("URL", url);
      try {
        const output = await axios.get(url, headers);
        return output;
      } catch (error) {
        console.log("ERROR", error);
      }
    }
  }
};

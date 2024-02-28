const axios = require('axios');
require('dotenv').config();
const { SpheronClient, ProtocolEnum } = require('@spheron/storage');
const storageClient = new SpheronClient({
  token: process.env.Spheron_Storage,
});

async function run(cid) {
  console.log('CID', cid);

  if (storageClient) {
    const res = await storageClient.getCIDStatus(cid);
    // console.log(res.pinStatus);
    if (!res.pinStatus) {
      // voting false
      console.log('VOTE FALSE');

      console.log('SLASH VOTE DUE TO FAKE VALUE');
      //console.log("VOTE", vote);
      return false;
    } else {
      let headers = {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ',
        },
      };

      const url = `https://${res.pinStatus.cid}.ipfs.dweb.link/healthyList.json`;
      console.log('URL', url);
      try {
        const output = await axios.get(url);
        console.log(output.data)
        return output;
      } catch (error) {
        console.log('ERROR', error);
      }
    }
  }
}

run('bafybeihkfrdjymyphkreucuuit65kj4v5gvzrpiqwmzdabxpsgtwarxety');

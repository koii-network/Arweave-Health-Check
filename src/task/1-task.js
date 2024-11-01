const dataDb = require('../../helpers/db');
const arweave_task = require('../../arweave_task');

export async function task(roundNumber) {
  try {
    // run arweave web scrapping
    console.log('********Arweave Webscrapiing started**********');

    // console.log('Scraping task called in roundNumber', roundNumber);
    const cid = await arweave_task(roundNumber);

    if (cid) {
      await dataDb.intializeData();
      await dataDb.addProof(roundNumber, cid); // store CID in levelDB
      console.log('Node Proof CID stored in roundNumber', roundNumber);
    } else {
      console.log('CID NOT FOUND');
    }

    console.log('********Arweave Webscrapiing ended**********');

    return cid;
  } catch (error) {
    console.log('Error in task job', error);
    return null;
  }
}

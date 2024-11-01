// Import the needed libraries
const axios = require('axios');

// Function to get a random transaction ID from a random block
const getRandomTransactionId = async () => {
  try {
    // Get the latest block height
    const infoResponse = await axios.get('https://arweave.net/info');
    const latestBlockHeight = infoResponse.data.height;

    // Select a random block from the range [1, latestBlockHeight]
    const randomBlockHeight = Math.floor(Math.random() * latestBlockHeight) + 1;

    // Define the GraphQL query to get the transactions from the random block
    const query = `
      {
        transactions(block: {min: ${randomBlockHeight}, max: ${randomBlockHeight}}) {
          edges {
            node {
              id
            }
          }
        }
      }
    `;

    // Get the transactions from the random block
    const transactionsResponse = await axios({
      url: 'https://arweave.net/graphql',
      method: 'post',
      data: {
        query: query,
      },
    });

    if (transactionsResponse.data.errors) {
      throw new Error(JSON.stringify(transactionsResponse.data.errors));
    }

    // Select a random transaction from the random block
    const transactions = transactionsResponse.data.data.transactions.edges;
    if (transactions.length === 0) {
      console.log('No transactions found in block', randomBlockHeight);
      return getRandomTransactionId();
    }

    const randomIndex = Math.floor(Math.random() * transactions.length);
    const randomTransactionId = transactions[randomIndex].node.id;

    console.log('Random Transaction ID:', randomTransactionId);
    return randomTransactionId;
  } catch (error) {
    console.error('Failed to get random transaction:', error);
    return null;
  }
};

module.exports = {
  getRandomTransactionId,
};

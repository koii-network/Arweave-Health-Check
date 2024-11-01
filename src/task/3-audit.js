import { namespaceWrapper } from '@_koii/namespace-wrapper';
const arweave_validate = require('./arweave_validate');

export async function audit(roundNumber) {
  console.log('auditTask called with round', roundNumber);
  console.log(
    await namespaceWrapper.getSlot(),
    'current slot while calling auditTask',
  );
  await namespaceWrapper.validateAndVoteOnNodes(validateNode, roundNumber);
}

// this function is called when a node is selected to validate the submission value
async function validateNode(submission_value, round) {
  // console.log('Received submission_value', submission_value, round);
  // import the arweave scrapping validate module
  const vote = await arweave_validate(submission_value, round);
  // console.log('Vote', vote);
  return vote;
}

// for the audit distribution
export async function auditDistribution(roundNumber) {
  console.log('AUDIT DISTRIBUTION CALLED WITHIN ROUND: ', roundNumber);
  await namespaceWrapper.validateAndVoteOnDistributionList(
    validateDistribution,
    roundNumber,
  );
}

async function validateDistribution(
  distributionListSubmitter,
  round,
  _dummyDistributionList,
  _dummyTaskState,
) {
  try {
    // console.log('DISTRIBUTION LIST SUBMITTER', distributionListSubmitter);
    const rawDistributionList = await namespaceWrapper.getDistributionList(
      distributionListSubmitter,
      round,
    );
    let fetchedDistributionList;
    if (rawDistributionList == null) {
      return true;
    } else {
      fetchedDistributionList = JSON.parse(rawDistributionList);
    }
    // console.log('FETCHED DISTRIBUTION LIST', fetchedDistributionList);
    const generateDistributionList = await this.generateDistributionList(
      round,
      _dummyTaskState,
    );

    if (Object.keys(generateDistributionList).length === 0) {
      console.log('UNABLE TO GENERATE DISTRIBUTION LIST');
      return true;
    }
    // Compare distribution list
    const parsed = fetchedDistributionList;
    // console.log(
    //   'COMPARE DISTRIBUTION LIST',
    //   parsed,
    //   generateDistributionList,
    // );
    const result = await shallowEqual(parsed, generateDistributionList);
    // console.log('RESULT', result);
    return result;
  } catch (err) {
    console.log('ERROR IN VALIDATING DISTRIBUTION', err);
    return true;
  }
}

async function shallowEqual(parsed, generateDistributionList) {
  if (typeof parsed === 'string') {
    parsed = JSON.parse(parsed);
  }

  // Normalize key quote usage for generateDistributionList
  generateDistributionList = JSON.parse(
    JSON.stringify(generateDistributionList),
  );

  const keys1 = Object.keys(parsed);
  const keys2 = Object.keys(generateDistributionList);
  if (keys1.length !== keys2.length) {
    return false;
  }

  for (let key of keys1) {
    if (parsed[key] !== generateDistributionList[key]) {
      return false;
    }
  }
  return true;
}

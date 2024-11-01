const { namespaceWrapper } = require('@_koii/namespace-wrapper');
export async function distribution(roundNumber, _dummyTaskState) {
  try {
    console.log('GenerateDistributionList called');
    // console.log('I am selected node');

    // Write the logic to generate the distribution list here by introducing the rules of your choice

    /*  **** SAMPLE LOGIC FOR GENERATING DISTRIBUTION LIST ******/

    let distributionList = {};
    let distributionCandidates = [];
    let taskAccountDataJSON = null;
    let taskStakeListJSON = null;
    try {
      taskAccountDataJSON = await namespaceWrapper.getTaskSubmissionInfo(
        roundNumber,
        true,
      );
    } catch (error) {
      console.error('ERROR IN FETCHING TASK SUBMISSION DATA', error);
      return distributionList;
    }
    if (taskAccountDataJSON == null) {
      console.error('ERROR IN FETCHING TASK SUBMISSION DATA');
      return distributionList;
    }
    const submissions = taskAccountDataJSON.submissions[roundNumber];
    const submissions_audit_trigger =
      taskAccountDataJSON.submissions_audit_trigger[roundNumber];
    if (submissions == null) {
      console.log(`No submisssions found in roundNumber ${roundNumber}`);
      return distributionList;
    } else {
      const keys = Object.keys(submissions);
      const values = Object.values(submissions);
      const size = values.length;
      // console.log('Submissions from last roundNumber: ', keys, values, size);
      taskStakeListJSON = await namespaceWrapper.getTaskState({
        is_stake_list_required: true,
      });
      if (taskStakeListJSON == null) {
        console.error('ERROR IN FETCHING TASK STAKING LIST');
        return distributionList;
      }
      // Logic for slashing the stake of the candidate who has been audited and found to be false
      for (let i = 0; i < size; i++) {
        const candidatePublicKey = keys[i];
        if (
          submissions_audit_trigger &&
          submissions_audit_trigger[candidatePublicKey]
        ) {
          // console.log(
          //   'distributions_audit_trigger votes ',
          //   submissions_audit_trigger[candidatePublicKey].votes,
          // );
          const votes = submissions_audit_trigger[candidatePublicKey].votes;
          if (votes.length === 0) {
            // slash 70% of the stake as still the audit is triggered but no votes are casted
            // Note that the votes are on the basis of the submission value
            // to do so we need to fetch the stakes of the candidate from the task state
            const stake_list = taskStakeListJSON.stake_list;
            const candidateStake = stake_list[candidatePublicKey];
            // const slashedStake = Math.floor(candidateStake * 0.7);
            distributionList[candidatePublicKey] = 0;
            // console.log('Candidate Stake', candidateStake);
          } else {
            let numOfVotes = 0;
            for (let index = 0; index < votes.length; index++) {
              if (votes[index].is_valid) numOfVotes++;
              else numOfVotes--;
            }

            if (numOfVotes < 0 && taskStakeListJSON) {
              // slash 70% of the stake as the number of false votes are more than the number of true votes
              // Note that the votes are on the basis of the submission value
              // to do so we need to fetch the stakes of the candidate from the task state
              const stake_list = taskStakeListJSON.stake_list;
              const candidateStake = stake_list[candidatePublicKey];
              // const slashedStake = Math.floor(candidateStake * 0.7);
              distributionList[candidatePublicKey] = 0;
              // console.log('Candidate Stake', candidateStake);
            }

            if (numOfVotes > 0) {
              distributionCandidates.push(candidatePublicKey);
            }
          }
        } else {
          distributionCandidates.push(candidatePublicKey);
        }
      }
    }

    // now distribute the rewards based on the valid submissions
    // Here it is assumed that all the nodes doing valid submission gets the same reward

    const reward = Math.floor(
      taskStakeListJSON.bounty_amount_per_round / distributionCandidates.length,
    );
    console.log('REWARD RECEIVED BY EACH NODE', reward);
    for (let i = 0; i < distributionCandidates.length; i++) {
      distributionList[distributionCandidates[i]] = reward;
    }
    // console.log('Distribution List', distributionList);
    return distributionList;
  } catch (err) {
    console.log('ERROR IN GENERATING DISTRIBUTION LIST', err);
  }
}

export async function selectAndGenerateDistributionList(
  round,
  isPreviousRoundFailed = false,
) {
  await namespaceWrapper.selectAndGenerateDistributionList(
    this.submitDistributionList,
    round,
    isPreviousRoundFailed,
  );
}

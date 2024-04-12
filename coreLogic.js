const { namespaceWrapper } = require('./namespaceWrapper');
const arweave_task = require('./arweave_task');
const arweave_validate = require('./arweave_validate');
const dataDb = require('./helpers/db');
class CoreLogic {
  async task(round) {
    // run arweave web scrapping
    console.log('********Arweave Webscrapiing started**********');

    // console.log('Scraping task called in round', round);
    const cid = await arweave_task(round);

    if (cid) {
      await dataDb.intializeData();
      await dataDb.addProof(round, cid); // store CID in levelDB
      console.log('Node Proof CID stored in round', round);
    } else {
      console.log('CID NOT FOUND');
    }

    console.log('********Arweave Webscrapiing ended**********');

    return cid;
  }

  async fetchSubmission(round) {
    console.log('**********IN FETCH SUBMISSION**********');

    // console.log('FetchSubmission called in round', round);

    await dataDb.intializeData();
    const cid = await dataDb.getProof(round); // retrieves the cid
    console.log('Arweave proofs CID', cid, 'in round', round);

    return cid;
  }

  async generateDistributionList(round, _dummyTaskState) {
    try {
      console.log('GenerateDistributionList called');
      // console.log('I am selected node');

      // Write the logic to generate the distribution list here by introducing the rules of your choice

      /*  **** SAMPLE LOGIC FOR GENERATING DISTRIBUTION LIST ******/

      let distributionList = {};
      let distributionCandidates = [];
      let taskAccountDataJSON = await namespaceWrapper.getTaskState();
      if (taskAccountDataJSON == null) taskAccountDataJSON = _dummyTaskState;
      const submissions = taskAccountDataJSON.submissions[round];
      const submissions_audit_trigger =
        taskAccountDataJSON.submissions_audit_trigger[round];
      if (submissions == null) {
        console.log(`No submisssions found in round ${round}`);
        return distributionList;
      } else {
        const keys = Object.keys(submissions);
        const values = Object.values(submissions);
        const size = values.length;
        // console.log('Submissions from last round: ', keys, values, size);

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
              const stake_list = taskAccountDataJSON.stake_list;
              const candidateStake = stake_list[candidatePublicKey];
              const slashedStake = candidateStake * 0.7;
              distributionList[candidatePublicKey] = -slashedStake;
              console.log('Candidate Stake', candidateStake);
            } else {
              let numOfVotes = 0;
              for (let index = 0; index < votes.length; index++) {
                if (votes[index].is_valid) numOfVotes++;
                else numOfVotes--;
              }

              if (numOfVotes < 0) {
                // slash 70% of the stake as the number of false votes are more than the number of true votes
                // Note that the votes are on the basis of the submission value
                // to do so we need to fetch the stakes of the candidate from the task state
                const stake_list = taskAccountDataJSON.stake_list;
                const candidateStake = stake_list[candidatePublicKey];
                const slashedStake = candidateStake * 0.7;
                distributionList[candidatePublicKey] = -slashedStake;
                console.log('Candidate Stake', candidateStake);
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
        taskAccountDataJSON.bounty_amount_per_round /
          distributionCandidates.length,
      );
      console.log('REWARD RECEIVED BY EACH NODE', reward);
      for (let i = 0; i < distributionCandidates.length; i++) {
        distributionList[distributionCandidates[i]] = reward;
      }
      console.log('Distribution List', distributionList);
      return distributionList;
    } catch (err) {
      console.log('ERROR IN GENERATING DISTRIBUTION LIST', err);
    }
  }

  submitDistributionList = async round => {
    // This upload the generated dustribution List

    console.log('SubmitDistributionList called');

    try {
      const distributionList = await this.generateDistributionList(round);

      const decider = await namespaceWrapper.uploadDistributionList(
        distributionList,
        round,
      );
      console.log('DECIDER', decider);

      if (decider) {
        const response =
          await namespaceWrapper.distributionListSubmissionOnChain(round);
        console.log('RESPONSE FROM DISTRIBUTION LIST', response);
      }
    } catch (err) {
      console.log('ERROR IN SUBMIT DISTRIBUTION', err);
    }
  }

  async selectAndGenerateDistributionList(
    round,
    isPreviousRoundFailed = false,
  ) {
    await namespaceWrapper.selectAndGenerateDistributionList(
      this.submitDistributionList,
      round,
      isPreviousRoundFailed,
    );
  }

  // this function is called when a node is selected to validate the submission value
  async validateNode(submission_value, round) {
    // console.log('Received submission_value', submission_value, round);

    // import the arweave scrapping validate module
    const vote = await arweave_validate(submission_value, round);
    // console.log('Vote', vote);
    return vote;
  }

  async shallowEqual(object1, object2) {
    const keys1 = Object.keys(object1);
    const keys2 = Object.keys(object2);
    if (keys1.length !== keys2.length) {
      return false;
    }
    for (let key of keys1) {
      if (object1[key] !== object2[key]) {
        return false;
      }
    }
    return true;
  }

  validateDistribution = async (distributionListSubmitter, round) => {
    try {
      console.log('Validate Distribution called');
      console.log('Distribution list Submitter', distributionListSubmitter);
      const fetchedDistributionList = JSON.parse(
        await namespaceWrapper.getDistributionList(
          distributionListSubmitter,
          round,
        ),
      );
      // console.log('FETCHED DISTRIBUTION LIST', fetchedDistributionList);
      const generateDistributionList = await this.generateDistributionList(
        round,
      );

      // compare distribution list

      const parsed = JSON.parse(fetchedDistributionList);
      // console.log(
      //   'compare distribution list',
      //   parsed,
      //   generateDistributionList,
      // );
      const result = await this.shallowEqual(parsed, generateDistributionList);
      console.log('RESULT', result);
      return result;
    } catch (err) {
      console.log('ERROR IN VALIDATING DISTRIBUTION', err);
      return true;
    }
  };

  // Submit Address with distributioon list to K2
  async submitTask(roundNumber) {
    console.log('submitTask called with round', roundNumber);
    try {
      // console.log('inside try');
      console.log(
        await namespaceWrapper.getSlot(),
        'current slot while calling submit',
      );
      const submission = await this.fetchSubmission(roundNumber);
      console.log('SUBMISSION', submission);
      // submit the submission to the K2
      if (submission !== null) {
        await namespaceWrapper.checkSubmissionAndUpdateRound(
          submission,
          roundNumber,
        );
        console.log('after the submission call');
      }
    } catch (error) {
      console.log('error in submission', error);
    }
  }

  async auditTask(roundNumber) {
    console.log('auditTask called with round', roundNumber);
    console.log(
      await namespaceWrapper.getSlot(),
      'current slot while calling auditTask',
    );
    await namespaceWrapper.validateAndVoteOnNodes(
      this.validateNode,
      roundNumber,
    );
  }

  async auditDistribution(roundNumber, isPreviousRoundFailed) {
    console.log('auditDistribution called with round', roundNumber);
    await namespaceWrapper.validateAndVoteOnDistributionList(
      this.validateDistribution,
      roundNumber,
      isPreviousRoundFailed

    );
  }
}
const coreLogic = new CoreLogic();

module.exports = { coreLogic };

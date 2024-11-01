const dataDb = require('./helpers/db');
const { namespaceWrapper } = require('@_koii/namespace-wrapper');

export async function submission(roundNumber) {}

async function submitDistributionList(roundNumber) {
  // This upload the generated dustribution List

  console.log('SubmitDistributionList called');

  try {
    const distributionList = await this.generateDistributionList(round);
    if (Object.keys(distributionList).length === 0) {
      console.log('NO DISTRIBUTION LIST GENERATED');
      return;
    }
    const decider = await namespaceWrapper.uploadDistributionList(
      distributionList,
      round,
    );
    console.log('DECIDER', decider);

    if (decider) {
      const response = await namespaceWrapper.distributionListSubmissionOnChain(
        round,
      );
      console.log('RESPONSE FROM DISTRIBUTION LIST', response);
    }
  } catch (err) {
    console.log('ERROR IN SUBMIT DISTRIBUTION', err);
  }
}

// Submit Address with distributioon list to K2
async function submitTask(roundNumber) {
  console.log('submitTask called with round', roundNumber);
  try {
    // console.log('inside try');
    const taskState = await namespaceWrapper.getTaskState({});
    const roundBeginSlot =
      taskState.starting_slot + roundNumber * taskState.round_time;
    const submission = await this.fetchSubmission(roundNumber);
    console.log('SUBMISSION', submission);
    const currentSlot = await namespaceWrapper.getSlot();
    console.log('current slot while calling submit', currentSlot);
    // wait for end of the submission window
    new Promise(resolve =>
      setTimeout(
        resolve,
        (roundBeginSlot + taskState.submission_window - currentSlot) * 408,
      ),
    );
    if (submission) {
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

const { coreLogic } = require('./coreLogic');
const { app } = require('./init');
const express = require('express');
const {
  namespaceWrapper,
  taskNodeAdministered,
} = require('./namespaceWrapper');
// const localShim = require('./k2-local-debugger'); // TEST to enable testing with K2 without round timers, enable this line and line 38
const routes = require('./routes');

async function setup() {
  console.log('setup function called');
  // Run default setup
  await namespaceWrapper.defaultTaskSetup();

  process.on('message', m => {
    console.log('CHILD got message:', m);
    if (m.functionCall == 'submitPayload') {
      console.log('submitPayload called');
      coreLogic.submitTask(m.roundNumber);
    } else if (m.functionCall == 'auditPayload') {
      console.log('auditPayload called');
      coreLogic.auditTask(m.roundNumber);
    } else if (m.functionCall == 'executeTask') {
      console.log('executeTask called');
      coreLogic.task(m.roundNumber);
    } else if (m.functionCall == 'generateAndSubmitDistributionList') {
      console.log('generateAndSubmitDistributionList called');
      coreLogic.submitDistributionList(m.roundNumber);
    } else if (m.functionCall == 'distributionListAudit') {
      console.log('distributionListAudit called');
      coreLogic.auditDistribution(m.roundNumber);
    }
  });

}

// Run main task
if (taskNodeAdministered) {
  setup();
}

// Run server
if (app) {
  app.use(express.json());
  app.use('/', routes);
}

const express = require('express');
const router = express.Router();
const dataDb = require('./helpers/db');
const fs = require('fs');
const { namespaceWrapper } = require('./namespaceWrapper');
const { TASK_ID } = require('./init');

// Middleware to log incoming requests
router.use((req, res, next) => {
  console.log(`Incoming ${req.method} request to ${req.originalUrl}`);
  next();
});

// Route to get task state
router.get('/taskState', async (req, res) => {
  const state = await namespaceWrapper.getTaskState({});
  console.log('TASK STATE', state);

  res.status(200).json({ taskState: state });
});

// Get Logs
router.get('/logs', async (req, res) => {
  let logs = namespaceWrapper.fs(
    'readFile',
    `./namespace/${TASK_ID}/logs.txt`,
    'utf8',
  );

  res.status(200).send(logs);
});

// endpoint for specific healthy arweave node by id
router.get('/arweave/healthy/get/:id', async (req, res) => {
  const { id } = req.params;
  let healthyItem = await dataDb.getHealthyItem(id);
  healthyItem = healthyItem || '[]';
  return res.status(200).send(healthyItem);
});

// endpoint for healthy arweave nodes list
router.get('/arweave/healthy/list', async (req, res) => {
  let healthyList = await dataDb.getHealthyList();
  healthyList = healthyList || '[]';
  return res.status(200).send(healthyList);
});

// endpoint for specific pending arweave node by id
router.get('/arweave/pending/get/:id', async (req, res) => {
  const { id } = req.params;
  let pendingItem = await dataDb.getPendingItem(id);
  pendingItem = pendingItem || '[]';
  return res.status(200).send(pendingItem);
});

// endpoint for pending arweave nodes list
router.get('/arweave/pending/list', async (req, res) => {
  let pendingList = await dataDb.getPendingList();
  pendingList = pendingList || '[]';
  return res.status(200).send(pendingList);
});

// endpoint for specific proof by round
router.get('/arweave/proof/get/:round', async (req, res) => {
  const { round } = req.params;
  let proof = await dataDb.getProof(round);
  proof = proof || '[]';
  return res.status(200).send(proof);
});

// endpoint for proof list
router.get('/arweave/proof/list', async (req, res) => {
  let proofList = await dataDb.getProofList();
  proofList = proofList || '[]';
  return res.status(200).send(proofList);
});

module.exports = router;

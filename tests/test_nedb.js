const Datastore = require('nedb-promises');

async function testInsertAndFind() {
  // Create a new datastore (in memory for simplicity)
  const db = Datastore.create("./testDB.db");

  db.ensureIndex({ fieldName: 'healthyId', unique: true, sparse: true }, function (err) {
    if (err) console.error('Index creation error:', err);
  });

  db.ensureIndex({ fieldName: 'pendingId', unique: true, sparse: true }, function (err) {
    if (err) console.error('Index creation error:', err);
  });

  // Insert a document
  const doc = { healthyId: '222.239.92.29:1988', someField: 'Some' };

  await db.insert(doc);
}

testInsertAndFind();
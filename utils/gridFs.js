const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

function getGridFSBucket() {
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error('MongoDB connection is not ready');
  }

  return new GridFSBucket(db, {
    bucketName: 'documents' 
  });
}

module.exports = { getGridFSBucket };

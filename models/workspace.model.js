
const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  userNID: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  type: {
    type: String, 
    required: true
  },
  structure: {
    type: Object, 
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Workspace', workspaceSchema);

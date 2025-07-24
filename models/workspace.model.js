
const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  userNID: {
    type: String,
  
  },
  title: {
    type: String,
   
  },
  type: {
    type: String, 
    
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

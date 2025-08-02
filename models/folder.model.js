// models/folder.model.js
const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: String,
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
}, { timestamps: true });

module.exports = mongoose.model('Folder', folderSchema);

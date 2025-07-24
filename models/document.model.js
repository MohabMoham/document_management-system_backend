const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  ownerNID: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['pdf', 'image', 'doc', 'other'],
    required: true
  },
  metadata: {
    version: { type: Number, default: 1 },
    tags: [String],
    access: [{
      userId: mongoose.Schema.Types.ObjectId,
      permission: { type: String, enum: ['read', 'write', 'admin'], default: 'read' }
    }]
  },
  content: {
    type: Object, 
    default: {}
  },
  filePath: {
    type: String 
  },
  deleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  }
});

documentSchema.index({ name: 'text' });
documentSchema.index({ type: 1 });
documentSchema.index({ 'metadata.tags': 1 });


module.exports = mongoose.model('Document', documentSchema);

const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  folderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Folder',
    
  },
  ownerNID: {
    type: String,
  
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['pdf', 'image', 'doc', 'other'],
   
  },
  metadata: {
    version: { type: Number, default: 1 },
    tags: [String],
    access: [{
      userId: mongoose.Schema.Types.ObjectId,
      permission: { type: String, enum: ['read', 'write', 'admin'], default: 'read' }
    }],
    size: { type: Number }, // File size in bytes
    mimeType: { type: String }
  },
  content: {
    type: Object, 
    default: {}
  },
  filePath: {
    type: String // GridFS file ID
  },
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});


documentSchema.index({ createdAt: 1 })         
documentSchema.index({ type: 1 })
documentSchema.index({ 'metadata.size': 1 })      
documentSchema.index({ name: 'text' })

documentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (this.deleted && !this.deletedAt) {
    this.deletedAt = new Date();
  } else if (!this.deleted && this.deletedAt) {
    this.deletedAt = null;
  }
  next();
});

// Method to get document with folder hierarchy
documentSchema.methods.getWithHierarchy = async function() {
  const folder = await mongoose.model('Folder').findById(this.folderId);
  const hierarchy = folder ? await folder.getHierarchy() : [];
  
  return {
    ...this.toObject(),
    folderHierarchy: hierarchy
  };
};

module.exports = mongoose.model('Document', documentSchema);
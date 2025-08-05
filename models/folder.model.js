const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  parentFolderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null 
  },
  ownerNID: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  path: {
    type: String, 
    default: ''
  },
  metadata: {
    color: { type: String, default: '#1976d2' },
    tags: [String],
    access: [{
      userId: mongoose.Schema.Types.ObjectId,
      permission: { type: String, enum: ['read', 'write', 'admin'], default: 'read' }
    }]
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


folderSchema.index({ createdAt: 1 })         
folderSchema.index({ type: 1 })
folderSchema.index({ 'metadata.size': 1 })      
folderSchema.index({ name: 'text' })


folderSchema.pre('save', async function(next) {
  this.updatedAt = new Date();
  
  
  if (this.isModified('name') || this.isModified('parentFolderId')) {
    await this.updatePath();
  }
  
  next();
});

folderSchema.methods.updatePath = async function() {
  if (!this.parentFolderId) {
    this.path = `/${this.name}`;
  } else {
    const parent = await mongoose.model('Folder').findById(this.parentFolderId);
    if (parent) {
      this.path = `${parent.path}/${this.name}`;
    }
  }
};


folderSchema.methods.getHierarchy = async function() {
  const hierarchy = [];
  let current = this;
  
  while (current) {
    hierarchy.unshift({
      _id: current._id,
      name: current.name,
      path: current.path
    });
    
    if (current.parentFolderId) {
      current = await mongoose.model('Folder').findById(current.parentFolderId);
    } else {
      current = null;
    }
  }
  
  return hierarchy;
};


folderSchema.statics.createRootFolder = async function(workspaceId, ownerNID, name = 'Root') {
  const rootFolder = new this({
    workspaceId,
    ownerNID,
    name,
    path: `/${name}`
  });
  
  return await rootFolder.save();
};

module.exports = mongoose.model('Folder', folderSchema);
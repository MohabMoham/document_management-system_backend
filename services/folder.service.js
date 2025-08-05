const Folder = require('../models/folder.model');
const Document = require('../models/document.model');
const { getUserNID } = require('./auth.service');

// Create a new folder
async function createFolder(userId, { workspaceId, parentFolderId, name, description, metadata }) {
  const userNID = await getUserNID(userId);
  if (!userNID) throw new Error('User not found.');

  
  if (parentFolderId) {
    const parentFolder = await Folder.findById(parentFolderId);
    if (!parentFolder) throw new Error('Parent folder not found.');
    if (parentFolder.workspaceId.toString() !== workspaceId) {
      throw new Error('Parent folder does not belong to the specified workspace.');
    }
    if (parentFolder.ownerNID !== userNID) {
      throw new Error('Unauthorized to create folder in this parent folder.');
    }
  }

  // Check for duplicate folder names in the same parent
  const duplicateCheck = await Folder.findOne({
    workspaceId,
    parentFolderId: parentFolderId || null,
    name,
    deleted: false
  });

  if (duplicateCheck) {
    throw new Error('A folder with this name already exists in this location.');
  }

  const folder = await Folder.create({
    workspaceId,
    parentFolderId: parentFolderId || null,
    ownerNID: userNID,
    name,
    description: description || '',
    metadata: metadata || {}
  });

  return folder;
}


async function getFolder(userId, folderId) {
  const userNID = await getUserNID(userId);
  if (!userNID) throw new Error('User not found.');

  const folder = await Folder.findById(folderId);
  if (!folder) throw new Error('Folder not found.');
  if (folder.ownerNID !== userNID) throw new Error('Unauthorized.');

  return folder;
}


async function getFoldersByWorkspace(userId, workspaceId, parentFolderId = null) {
  const userNID = await getUserNID(userId);
  if (!userNID) throw new Error('User not found.');

  const query = {
    workspaceId,
    ownerNID: userNID,
    parentFolderId: parentFolderId,
    deleted: false
  };

  return await Folder.find(query).sort({ name: 1 });
}

// Get folder tree structure
async function getFolderTree(userId, workspaceId, parentFolderId = null) {
  const userNID = await getUserNID(userId);
  if (!userNID) throw new Error('User not found.');

  const folders = await Folder.find({
    workspaceId,
    ownerNID: userNID,
    parentFolderId: parentFolderId,
    deleted: false
  }).sort({ name: 1 });

  // Recursively build tree structure
  const tree = await Promise.all(folders.map(async (folder) => {
    const subfolders = await getFolderTree(userId, workspaceId, folder._id);
    const documentCount = await Document.countDocuments({
      folderId: folder._id,
      deleted: false
    });

    return {
      ...folder.toObject(),
      subfolders,
      documentCount
    };
  }));

  return tree;
}


async function updateFolder(userId, folderId, updateData) {
  const userNID = await getUserNID(userId);
  const folder = await Folder.findById(folderId);

  if (!folder) throw new Error('Folder not found.');
  if (folder.ownerNID !== userNID) throw new Error('Unauthorized.');

 
  if (updateData.parentFolderId !== undefined) {
    if (updateData.parentFolderId) {
      const newParent = await Folder.findById(updateData.parentFolderId);
      if (!newParent) throw new Error('New parent folder not found.');
      if (newParent.workspaceId.toString() !== folder.workspaceId.toString()) {
        throw new Error('Cannot move folder to different workspace.');
      }
      
     
      if (await isDescendantOf(updateData.parentFolderId, folderId)) {
        throw new Error('Cannot move folder into its own subfolder.');
      }
    }

   
    const duplicateCheck = await Folder.findOne({
      workspaceId: folder.workspaceId,
      parentFolderId: updateData.parentFolderId || null,
      name: updateData.name || folder.name,
      deleted: false,
      _id: { $ne: folderId }
    });

    if (duplicateCheck) {
      throw new Error('A folder with this name already exists in this location.');
    }
  }

  const updatedFolder = await Folder.findByIdAndUpdate(
    folderId,
    { ...updateData, updatedAt: new Date() },
    { new: true }
  );

  
  if (updateData.name || updateData.parentFolderId !== undefined) {
    await updateSubfolderPaths(folderId);
  }

  return updatedFolder;
}


async function deleteFolder(userId, folderId) {
  const userNID = await getUserNID(userId);
  const folder = await Folder.findById(folderId);

  if (!folder) throw new Error('Folder not found.');
  if (folder.ownerNID !== userNID) throw new Error('Unauthorized.');


  await deleteFolderRecursive(folderId);

  return { message: 'Folder and all contents moved to recycle bin.' };
}


async function getDeletedFolders(userId, workspaceId = null) {
  const userNID = await getUserNID(userId);
  if (!userNID) throw new Error('User not found.');

  const query = {
    ownerNID: userNID,
    deleted: true
  };

  if (workspaceId) {
    query.workspaceId = workspaceId;
  }

  return await Folder.find(query).sort({ deletedAt: -1 });
}


async function restoreFolder(userId, folderId) {
  const userNID = await getUserNID(userId);
  const folder = await Folder.findById(folderId);

  if (!folder) throw new Error('Folder not found.');
  if (folder.ownerNID !== userNID) throw new Error('Unauthorized.');
  if (!folder.deleted) throw new Error('Folder is not in recycle bin.');

  
  if (folder.parentFolderId) {
    const parentFolder = await Folder.findById(folder.parentFolderId);
    if (!parentFolder || parentFolder.deleted) {
      throw new Error('Cannot restore folder: parent folder no longer exists.');
    }
  }

  folder.deleted = false;
  folder.deletedAt = null;
  await folder.save();

  return { message: 'Folder restored successfully.', folder };
}


async function permanentlyDeleteFolder(userId, folderId) {
  const userNID = await getUserNID(userId);
  const folder = await Folder.findById(folderId);

  if (!folder) throw new Error('Folder not found.');
  if (folder.ownerNID !== userNID) throw new Error('Unauthorized.');
  if (!folder.deleted) throw new Error('Folder must be in recycle bin to permanently delete.');


  const documents = await Document.find({ folderId, deleted: true });
  for (const doc of documents) {
   
    if (doc.filePath) {
      try {
        const { getGridFSBucket } = require('../utils/gridFs');
        const mongoose = require('mongoose');
        const bucket = getGridFSBucket();
        const fileId = new mongoose.Types.ObjectId(doc.filePath);
        await bucket.delete(fileId);
      } catch (err) {
        console.error('Error deleting file from GridFS:', err);
      }
    }
  }

  await Document.deleteMany({ folderId, deleted: true });
  await Folder.findByIdAndDelete(folderId);

  return { message: 'Folder permanently deleted.' };
}


async function searchFolders(userId, filters = {}) {
  const userNID = await getUserNID(userId);
  if (!userNID) throw new Error('User not found.');

  const query = { ownerNID: userNID, deleted: false };

  if (filters.name) {
    query.name = { $regex: filters.name, $options: 'i' };
  }

  if (filters.workspaceId) {
    query.workspaceId = filters.workspaceId;
  }

  return await Folder.find(query).sort({ updatedAt: -1 });
}


async function isDescendantOf(ancestorId, descendantId) {
  if (ancestorId === descendantId) return true;

  const descendant = await Folder.findById(descendantId);
  if (!descendant || !descendant.parentFolderId) return false;

  return await isDescendantOf(ancestorId, descendant.parentFolderId);
}


async function deleteFolderRecursive(folderId) {

  await Document.updateMany(
    { folderId, deleted: false },
    { deleted: true, deletedAt: new Date() }
  );


  const subfolders = await Folder.find({ parentFolderId: folderId, deleted: false });
  for (const subfolder of subfolders) {
    await deleteFolderRecursive(subfolder._id);
  }

  
  await Folder.findByIdAndUpdate(folderId, { 
    deleted: true, 
    deletedAt: new Date() 
  });
}


async function updateSubfolderPaths(folderId) {
  const subfolders = await Folder.find({ parentFolderId: folderId });
  
  for (const subfolder of subfolders) {
    await subfolder.updatePath();
    await subfolder.save();
    await updateSubfolderPaths(subfolder._id);
  }
}

module.exports = {
  createFolder,
  getFolder,
  getFoldersByWorkspace,
  getFolderTree,
  updateFolder,
  deleteFolder,
  getDeletedFolders,
  restoreFolder,
  permanentlyDeleteFolder,
  searchFolders
};
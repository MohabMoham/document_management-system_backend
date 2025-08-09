const mime = require('mime-types');
const path = require('path');
const Document = require('../models/document.model');
const Folder = require('../models/folder.model');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const { getGridFSBucket } = require('../utils/gridFs');
const mongoose = require('mongoose');
const { getUserNID } = require('./auth.service');

async function createDocument(userId, { workspaceId, folderId, name, type, content }) {
  const userNID = await getUserNID(userId);
  if (!userNID) throw new Error('User not found.');

  const folder = await Folder.findById(folderId);
  if (!folder) throw new Error('Folder not found.');
  if (folder.ownerNID !== userNID) throw new Error('Unauthorized to create document in this folder.');
  if (folder.workspaceId.toString() !== workspaceId) {
    throw new Error('Folder does not belong to the specified workspace.');
  }
   
  const document = await Document.create({
    workspaceId,
    folderId,
    ownerNID: userNID,
    name,
    type,
    content
  });

  return document;
}

async function getDocument(docId) {
  return await Document.findById(docId);
}

async function getDocumentsByUserId(userId) {
  const userNID = await getUserNID(userId);
  if (!userNID) throw new Error('User not found.');
 
  return await Document.find({ ownerNID: userNID, deleted: false });
}


async function getDocumentsByFolder(userId, folderId) {
  const userNID = await getUserNID(userId);
  if (!userNID) throw new Error('User not found.');

 
  const folder = await Folder.findById(folderId);
  if (!folder) throw new Error('Folder not found.');
  if (folder.ownerNID !== userNID) throw new Error('Unauthorized.');

  return await Document.find({ 
    folderId, 
    ownerNID: userNID, 
    deleted: false 
  }).sort({ updatedAt: -1 });
}

async function updateDocument(userId, docId, updatedData) {
  const userNID = await getUserNID(userId);
  const document = await Document.findById(docId);

  if (!document) throw new Error('Document not found.');
  if (document.ownerNID !== userNID) throw new Error('Unauthorized');

  
  if (updatedData.folderId && updatedData.folderId !== document.folderId.toString()) {
    const newFolder = await Folder.findById(updatedData.folderId);
    if (!newFolder) throw new Error('Target folder not found.');
    if (newFolder.ownerNID !== userNID) throw new Error('Unauthorized to move document to this folder.');
    if (newFolder.workspaceId.toString() !== document.workspaceId.toString()) {
      throw new Error('Cannot move document to folder in different workspace.');
    }
  }
  
  return await Document.findByIdAndUpdate(
    docId,
    { ...updatedData, updatedAt: new Date() },
    { new: true }
  );
}


async function moveDocument(userId, docId, targetFolderId) {
  const userNID = await getUserNID(userId);
  const document = await Document.findById(docId);

  if (!document) throw new Error('Document not found.');
  if (document.ownerNID !== userNID) throw new Error('Unauthorized.');

  const targetFolder = await Folder.findById(targetFolderId);
  if (!targetFolder) throw new Error('Target folder not found.');
  if (targetFolder.ownerNID !== userNID) throw new Error('Unauthorized to move document to this folder.');
  
 
  if (targetFolder.workspaceId.toString() !== document.workspaceId.toString()) {
    throw new Error('Cannot move document to folder in different workspace.');
  }

  document.folderId = targetFolderId;
  document.updatedAt = new Date();
  await document.save();

  return { message: 'Document moved successfully.', document };
}


async function deleteDocument(userId, docId) {
  const userNID = await getUserNID(userId);
  const document = await Document.findById(docId);
  
  if (!document) throw new Error('Document not found.');
  if (document.ownerNID !== userNID) throw new Error('Unauthorized');

  document.deleted = true;
  document.deletedAt = new Date();
  await document.save();

  return { message: 'Document moved to recycle bin successfully.' };
}


async function getDeletedDocuments(userId, workspaceId = null, folderId = null) {
  const userNID = await getUserNID(userId);
  if (!userNID) throw new Error('User not found.');

  const query = { 
    ownerNID: userNID, 
    deleted: true 
  };

  if (workspaceId) {
    query.workspaceId = workspaceId;
  }

  if (folderId) {
    query.folderId = folderId;
  }

  return await Document.find(query).sort({ deletedAt: -1 });
}

async function restoreDocument(userId, docId) {
  const userNID = await getUserNID(userId);
  const document = await Document.findById(docId);

  if (!document) throw new Error('Document not found.');
  if (document.ownerNID !== userNID) throw new Error('Unauthorized');
  if (!document.deleted) throw new Error('Document is not in recycle bin.');



  document.deleted = false;
  document.deletedAt = null;
  document.updatedAt = new Date(); 
  await document.save();

  return { message: 'Document restored successfully.', document };
}

async function permanentlyDeleteDocument(userId, docId) {
  const userNID = await getUserNID(userId);
  const document = await Document.findById(docId);

  if (!document) throw new Error('Document not found.');
  if (document.ownerNID !== userNID) throw new Error('Unauthorized');
  if (!document.deleted) throw new Error('Document must be in recycle bin to permanently delete.');

  
  if (document.filePath) {
    try {
      const bucket = getGridFSBucket();
      const fileId = new mongoose.Types.ObjectId(document.filePath);
      await bucket.delete(fileId);
      console.log(`File ${fileId} deleted from GridFS`);
    } catch (err) {
      console.error('Error deleting file from GridFS:', err);
    }
  }

  await Document.findByIdAndDelete(docId);

  return { message: 'Document permanently deleted.' };
}

async function emptyRecycleBin(userId, workspaceId = null, folderId = null) {
  const userNID = await getUserNID(userId);
  if (!userNID) throw new Error('User not found.');

  const query = { 
    ownerNID: userNID, 
    deleted: true 
  };

  if (workspaceId) {
    query.workspaceId = workspaceId;
  }

  if (folderId) {
    query.folderId = folderId;
  }

  const deletedDocuments = await Document.find(query);
  

  const bucket = getGridFSBucket();
  const deletePromises = deletedDocuments.map(async (doc) => {
    if (doc.filePath) {
      try {
        const fileId = new mongoose.Types.ObjectId(doc.filePath);
        await bucket.delete(fileId);
      } catch (err) {
        console.error(`Error deleting file ${doc.filePath} from GridFS:`, err);
      }
    }
  });

  await Promise.all(deletePromises);
  
  const result = await Document.deleteMany(query);

  return { 
    message: `${result.deletedCount} documents permanently deleted from recycle bin.`,
    deletedCount: result.deletedCount
  };
}

async function saveUploadedDocument({ workspaceId, folderId, ownerNID, type, name, fileId, metadata }) {
  const document = await Document.create({
    workspaceId,
    folderId,
    ownerNID,
    name,
    type,
    filePath: fileId.toString(),
    metadata: metadata || {}
  });
  return document;
}

async function handleUploadAndSave({ file, workspaceId, folderId, ownerNID, type, name,userId }) {
  if (folderId) {
    const folder = await Folder.findById(folderId);
    if (!folder) throw new Error('Folder not found.');
    if (folder.workspaceId.toString() !== workspaceId) {
      throw new Error('Folder does not belong to the specified workspace.');
    }
  }

  return new Promise(async (resolve, reject) => {
    const bucket = getGridFSBucket();
    const fileName = `${Date.now()}-${file.originalname}`;
    const uploadStream = bucket.openUploadStream(fileName, {
      metadata: {
        workspaceId,
        folderId: folderId || null,
        ownerNID,
        type,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      }
    });

    uploadStream.end(file.buffer);

    uploadStream.on('error', (err) => {
      reject(new Error('Error uploading file to GridFS: ' + err.message));
    });

    uploadStream.on('finish', async () => {
      try {
        const existingDoc = await Document.findOne({
          workspaceId,
          folderId: folderId || null,
          name: name || file.originalname,
          deleted: false
        });

        if (existingDoc) {
          
          existingDoc.versions.push({
            version: existingDoc.metadata.version,
            uploadedAt: new Date(),
           uploadedBy: new mongoose.Types.ObjectId(userId),
            filePath: existingDoc.filePath,
            metadata: {
              size: existingDoc.metadata.size,
              mimeType: existingDoc.metadata.mimeType
            }
          });

          // Update with new version
          existingDoc.filePath = uploadStream.id;
          existingDoc.metadata.size = file.size;
          existingDoc.metadata.mimeType = file.mimetype;
          existingDoc.metadata.version += 1;

          await existingDoc.save();
          resolve(existingDoc);
        } else {
          // Create new document
          const newDoc = await saveUploadedDocument({
            workspaceId,
            folderId: folderId || null,
            ownerNID,
            type,
            name: name || file.originalname,
            fileId: uploadStream.id,
            metadata: {
              size: file.size,
              mimeType: file.mimetype
            }
          });
          resolve(newDoc);
        }
      } catch (err) {
        reject(err);
      }
    });
  });
}

async function getDocumentStream(docId) {
  const document = await Document.findById(docId);
  if (!document || !document.filePath) throw new Error('Document or file not found');

  const bucket = getGridFSBucket();
  const fileId = new mongoose.Types.ObjectId(document.filePath);
  const file = bucket.openDownloadStream(fileId);

  return { file, filename: document.name };
}





async function getDocumentBase64(userId, docId) {
  const userNID = await getUserNID(userId);
  const document = await Document.findById(docId);

  if (!document) throw new Error('Document not found.');
  if (document.ownerNID !== userNID) throw new Error('Unauthorized');

  const bucket = getGridFSBucket();
  const fileId = new mongoose.Types.ObjectId(document.filePath);
  const downloadStream = bucket.openDownloadStream(fileId);

  const chunks = [];

  return new Promise((resolve, reject) => {
    downloadStream.on('data', (chunk) => chunks.push(chunk));
    downloadStream.on('error', (err) => reject(err));
    downloadStream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const base64String = buffer.toString('base64');
      const mimeType = mime.lookup(document.name) || 'application/octet-stream';
      const fullDataURI = `data:${mimeType};base64,${base64String}`;
      resolve(fullDataURI);
    });
  });
}

async function getDocumentsByWorkspace(workspaceId, filters = {}) {
  const query = { workspaceId, deleted: false };

  if (filters.type) query.type = filters.type;
  if (filters.name) query.name = { $regex: filters.name, $options: 'i' };
  if (filters.folderId) query.folderId = filters.folderId;

  return await Document.find(query).sort({ updatedAt: -1 });
}

async function getDeletedDocumentsByWorkspace(workspaceId, filters = {}) {
  const query = { workspaceId, deleted: true };

  if (filters.type) query.type = filters.type;
  if (filters.name) query.name = { $regex: filters.name, $options: 'i' };
  if (filters.folderId) query.folderId = filters.folderId;

  return await Document.find(query).sort({ deletedAt: -1 });
}

async function searchDocuments(userId, filters = {}) {
  const query = { deleted: false };

  const userNID = await getUserNID(userId);
  if (!userNID) throw new Error('User not found.');
  
  query.ownerNID = userNID;

  if (filters.name) {
    query.name = { $regex: filters.name, $options: 'i' };
  }

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.workspaceId) {
    query.workspaceId = filters.workspaceId;
  }

  if (filters.folderId) {
    query.folderId = filters.folderId;
  }
  if (filters.date) {
  const now = new Date();
  let startDate;

  switch (filters.date) {
    case 'today':
      startDate = new Date(now.toDateString());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
  }

  if (startDate) query.updatedAt = { $gte: startDate };
}
if (filters.sortBy === 'size') {
  documents = await Document.find(query).sort({ 'metadata.size': filters.order === 'asc' ? 1 : -1 });
}


  const documents = await Document.find(query).sort({ updatedAt: -1 });
  

  return documents;
}

async function searchDeletedDocuments(userId, filters = {}) {
  const query = { deleted: true };

  const userNID = await getUserNID(userId);
  if (!userNID) throw new Error('User not found.');
  
  query.ownerNID = userNID;
  
  if (filters.name) {
    query.name = { $regex: filters.name, $options: 'i' };
  }

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.workspaceId) {
    query.workspaceId = filters.workspaceId;
  }

  if (filters.folderId) {
    query.folderId = filters.folderId;
  }

  return await Document.find(query).sort({ deletedAt: -1 });
}


async function getDocumentsWithFolderStructure(userId, workspaceId) {
  const userNID = await getUserNID(userId);
  if (!userNID) throw new Error('User not found.');

 
  const folders = await Folder.find({ 
    workspaceId, 
    ownerNID: userNID, 
    deleted: false 
  }).sort({ path: 1 });


  const documents = await Document.find({ 
    workspaceId, 
    ownerNID: userNID, 
    deleted: false 
  }).sort({ name: 1 });

 
  const structure = {};
  
  folders.forEach(folder => {
    structure[folder._id] = {
      folder: folder,
      documents: [],
      subfolders: []
    };
  });


  documents.forEach(doc => {
    if (structure[doc.folderId]) {
      structure[doc.folderId].documents.push(doc);
    }
  });


  const rootFolders = folders.filter(f => !f.parentFolderId);
  
  function buildHierarchy(folderId) {
    const folderData = structure[folderId];
    if (!folderData) return null;

    const subfolders = folders
      .filter(f => f.parentFolderId && f.parentFolderId.toString() === folderId.toString())
      .map(f => buildHierarchy(f._id))
      .filter(Boolean);

    return {
      ...folderData,
      subfolders
    };
  }

  return rootFolders.map(f => buildHierarchy(f._id)).filter(Boolean);
}

async function getDocumentVersions(documentId) {
  if (!mongoose.Types.ObjectId.isValid(documentId)) throw new Error('Invalid document ID');

  const doc = await Document.findById(documentId).select('versions');
  if (!doc) throw new Error('Document not found');

  return doc.versions.sort((a, b) => b.uploadedAt - a.uploadedAt);
}

async function restoreDocumentVersion(userId, documentId, versionId) {
  if (!mongoose.Types.ObjectId.isValid(documentId)) throw new Error('Invalid document ID');
  if (!mongoose.Types.ObjectId.isValid(versionId)) throw new Error('Invalid version ID');

  console.log('Received versionId:', versionId, 'Type:', typeof versionId);
  
  const document = await Document.findById(documentId);
  if (!document) throw new Error('Document not found');

  const userNID = await getUserNID(userId);
  if (document.ownerNID !== userNID) throw new Error('Unauthorized');

  const version = document.versions.id(versionId); 
  if (!version) throw new Error('Version not found');

  // Save current as new version
  document.versions.push({
    version: document.metadata.version,
    uploadedAt: new Date(),
    uploadedBy: userId,
    filePath: document.filePath,
    metadata: {
      size: document.metadata.size,
      mimeType: document.metadata.mimeType,
      changeNote: "Auto-saved before restore"
    }
  });

  // Restore version
  document.filePath = version.filePath;
  document.metadata.size = version.metadata.size;
  document.metadata.mimeType = version.metadata.mimeType;
  document.metadata.version += 1;
  document.updatedAt = new Date();

  await document.save();
  return document;
}



async function deleteDocumentVersion(userId, documentId, versionIndex) {
  if (!mongoose.Types.ObjectId.isValid(documentId)) throw new Error('Invalid document ID');

  const document = await Document.findById(documentId);
  if (!document) throw new Error('Document not found');

  const userNID = await getUserNID(userId);
  if (document.ownerNID !== userNID) throw new Error('Unauthorized');

  if (versionIndex < 0 || versionIndex >= document.versions.length) {
    throw new Error('Invalid version index');
  }

  document.versions.splice(versionIndex, 1);
  await document.save();
  return { success: true, message: 'Version deleted successfully.' };
}


module.exports = {
  createDocument,
  getDocument,
  getDocumentsByUserId,
  getDocumentsByFolder,
  updateDocument,
  moveDocument,
  deleteDocument,
  saveUploadedDocument,
  getDocumentStream,
  handleUploadAndSave,
  getDocumentBase64,
  getDocumentsByWorkspace,
  searchDocuments,
  getDeletedDocuments,
  restoreDocument,
  permanentlyDeleteDocument,
  emptyRecycleBin,
  getDeletedDocumentsByWorkspace,
  searchDeletedDocuments,
  getDocumentsWithFolderStructure,
  getDocumentVersions,
  restoreDocumentVersion,
  deleteDocumentVersion
};
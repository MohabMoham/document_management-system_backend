const mime = require('mime-types');
const path = require('path');
const Document = require('../models/document.model');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const { getGridFSBucket } = require('../utils/gridFs');
const mongoose = require('mongoose');
const { getUserNID } = require('./auth.service'); // Importing the auth service to get user NID



async function createDocument(userId, { workspaceId, name, type, content }) {
  const userNID = await getUserNID(userId);
  if (!userNID) throw new Error('User not found.');
   
  const document = await Document.create({
    workspaceId,
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





async function updateDocument(userId, docId, updatedData) {
  const userNID = await getUserNID(userId);
  const document = await Document.findById(docId);

  if (!document) throw new Error('Document not found.');
  if (document.ownerNID !== userNID) throw new Error('Unauthorized');
  
  return await Document.findByIdAndUpdate(
    docId,
    { ...updatedData, updatedAt: new Date() },
    { new: true }
  );
}


// Soft delete - moves document to recycle bin
async function deleteDocument(userId, docId) {
  const userNID = await getUserNID(userId);
  const document = await Document.findById(docId);
  
  if (!document) throw new Error('Document not found.');
  if (document.ownerNID !== userNID) throw new Error('Unauthorized');

  document.deleted = true;
  await document.save();

  return { message: 'Document moved to recycle bin successfully.' };
}

// NEW: Get deleted documents (recycle bin)
async function getDeletedDocuments(userId, workspaceId = null) {
  const userNID = await getUserNID(userId);
  if (!userNID) throw new Error('User not found.');

  const query = { 
    ownerNID: userNID, 
    deleted: true 
  };

  // If workspaceId is provided, filter by workspace
  if (workspaceId) {
    query.workspaceId = workspaceId;
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


async function emptyRecycleBin(userId, workspaceId = null) {
  const userNID = await getUserNID(userId);
  if (!userNID) throw new Error('User not found.');

  const query = { 
    ownerNID: userNID, 
    deleted: true 
  };

  if (workspaceId) {
    query.workspaceId = workspaceId;
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




async function saveUploadedDocument({ workspaceId, ownerNID, type, name, fileId }) {
  const document = await Document.create({
    workspaceId,
    ownerNID,
    name,
    type,
    filePath: fileId.toString(), 
  });
  return document;
}


async function getDocumentStream(docId) {
  const document = await Document.findById(docId);
  if (!document || !document.filePath) throw new Error('Document or file not found');

  const bucket = getGridFSBucket();
  const fileId = new mongoose.Types.ObjectId(document.filePath);
  const file = bucket.openDownloadStream(fileId);
  console.log(file)

  return { file, filename: document.name };
}


async function handleUploadAndSave({ file, workspaceId, ownerNID, type, name }) {
  return new Promise((resolve, reject) => {
    const bucket = getGridFSBucket();
    const fileName = `${Date.now()}-${file.originalname}`;

    const uploadStream = bucket.openUploadStream(fileName, {
      metadata: {
        workspaceId,
        ownerNID,
        type
      }
    });

    uploadStream.end(file.buffer); 

    uploadStream.on('error', (err) => {
      reject(new Error('Error uploading file to GridFS: ' + err.message));
    });

    uploadStream.on('finish', async () => {
      try {
        const savedDoc = await saveUploadedDocument({
          workspaceId,
          ownerNID,
          type,
          name: name || file.originalname,
          fileId: uploadStream.id
        });
        resolve(savedDoc);
      } catch (err) {
        reject(err);
      }
    });
  });
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

      // ➕ Infer MIME type from original filename (document.originalName)
     
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

  return await Document.find(query).sort({ updatedAt: -1 });
}


async function getDeletedDocumentsByWorkspace(workspaceId, filters = {}) {
  const query = { workspaceId, deleted: true };

  if (filters.type) query.type = filters.type;
  if (filters.name) query.name = { $regex: filters.name, $options: 'i' };

  return await Document.find(query).sort({ deletedAt: -1 });
}


async function searchDocuments(userId, filters = {}) {
  const query = { deleted: false };

  const userNID = await getUserNID(userId);
  if (!userNID) throw new Error('User not found.');
  
  if (filters.name) {
    query.name = { $regex: filters.name, $options: 'i' };
  }

 
  if (filters.type) {
    query.type = filters.type;
  }


  if (filters.workspaceId) {
    query.workspaceId = filters.workspaceId;
  }

  return await Document.find(query).sort({ updatedAt: -1 });
}


async function searchDeletedDocuments(userId, filters = {}) {
  const query = { deleted: true };

  const userNID = await getUserNID(userId);
  if (!userNID) throw new Error('User not found.');
  
  if (filters.name) {
    query.name = { $regex: filters.name, $options: 'i' };
  }

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.workspaceId) {
    query.workspaceId = filters.workspaceId;
  }

  return await Document.find(query).sort({ deletedAt: -1 });
}

module.exports = {
  createDocument,
  getDocument,
  getDocumentsByUserId,
  updateDocument,
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
  searchDeletedDocuments
};
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


async function deleteDocument(userId, docId) {
  const userNID = await getUserNID(userId);
  const document = await Document.findById(docId);

  if (!document) throw new Error('Document not found.');
  if (document.ownerNID !== userNID) throw new Error('Unauthorized');

  document.deleted = true;
  await document.save();

  return { message: 'Document deleted successfully.' };
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
      resolve(base64String);
    });
  });
}

async function getDocumentsByWorkspace(workspaceId, filters = {}) {
 
  const query = { workspaceId, deleted: false };

  if (filters.type) query.type = filters.type;
  if (filters.name) query.name = { $regex: filters.name, $options: 'i' };

  return await Document.find(query).sort({ updatedAt: -1 });
}


async function searchDocuments(userId, filters = {}) {
  const query = { deleted: false };

  const userNID = await getUserNID(userId);
  if (!userNID) throw new Error('User not found.');
  if (filters.name) {
    query.name = { $regex: filters.name, $options: 'i' };
 
  }

  // Exact match on type
  if (filters.type) {
    query.type = filters.type;
  }

  return await Document.find(query).sort({ updatedAt: -1 });
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
  searchDocuments
 
};
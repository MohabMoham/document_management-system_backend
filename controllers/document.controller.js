const documentService = require('../services/document.service');
const { getUserNID } = require('../services/auth.service');


exports.createDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const newDoc = await documentService.createDocument(userId, req.body);
    res.status(201).json(newDoc);
   
  } catch (error) {
   
    res.status(400).json({ error: error.message });
  }
};


exports.getDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    const docs = await documentService.getDocumentsByUserId(userId); 

    res.status(200).json({
      count: docs.length,
      results: docs
    });
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
};



exports.updateDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const docId = req.params.id;
    const updatedDoc = await documentService.updateDocument(userId, docId, req.body);
    res.status(200).json(updatedDoc);
  } catch (error) {
    
    res.status(400).json({ error: error.message });
  }
};


exports.deleteDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const docId = req.params.id;
    const result = await documentService.deleteDocument(userId, docId);
    res.status(200).json(result);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
};





exports.uploadDocument = async (req, res) => {
  try {
    const { workspaceId, type, name } = req.body;
    const userId = req.user.id; 
    if(!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userNID = await getUserNID(userId);
    if (!userNID) {
      return res.status(403).json({ error: 'User not found' });
    }

    const doc = await documentService.handleUploadAndSave({
      file: req.file,
      workspaceId,
      ownerNID: userNID, 
      type,
      name
    });

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.downloadDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params; 

    const userNID = await getUserNID(userId);
    if (!userNID) {
      return res.status(403).json({ error: 'User not found' });
    }

    
    const document = await documentService.getDocument(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    if (document.ownerNID !== userNID) {
      return res.status(403).json({ error: 'Unauthorized to download this document' });
    }

    if (document.deleted) {
      return res.status(404).json({ error: 'Document not found' });
    }
   
    
    const { file, filename } = await documentService.getDocumentStream(id);
    
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    file.pipe(res);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

exports.previewDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const docId = req.params.id;

    const base64Data = await documentService.getDocumentBase64(userId, docId);

    res.status(200).json({ base64: base64Data });
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
};

exports.getDocByWorkspace = async (req, res) => {
  try {
   
    const { workspaceId } = req.params;
    const filters = req.query;
    const docs = await documentService.getDocumentsByWorkspace(workspaceId, filters);
    res.json(docs);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
      
  }
};

exports.searchDocuments = async (req, res) => {
  try {
    const filters = req.query;
    const results = await documentService.searchDocuments(req.user.id, filters);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
};


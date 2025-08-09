const upload = require('../middlewares/gridFsStorage');
const express = require('express');
const router = express.Router();
const controller = require('../controllers/document.controller');
const { authMiddleware, checkRole } = require('../middlewares/authMiddleware');


router.post('/documents', authMiddleware,checkRole(['user']), controller.createDocument);
router.get('/documents', authMiddleware, checkRole(['user']), controller.getDocuments);
router.patch('/documents/:id', authMiddleware, checkRole(['user']),controller.updateDocument);
router.delete('/documents/:id', authMiddleware,checkRole(['user']), controller.deleteDocument);
router.post('/documents/upload', authMiddleware, upload.single("file"), controller.uploadDocument);
router.get('/documents/download/:id', authMiddleware,checkRole(['user']),controller.downloadDocument);
router.get('/documents/:id/preview', authMiddleware, checkRole(['user']),controller.previewDocument);
router.get('/documents/workspace/:workspaceId', authMiddleware,checkRole(['user']),controller.getDocByWorkspace);
router.get('/documents/search', authMiddleware, controller.searchDocuments);
router.get('/documents/deleted/list', authMiddleware, controller.getDeletedDocuments);
router.put('/documents/:id/restore', authMiddleware, controller.restoreDocument);
router.delete('/documents/:id/permanent', authMiddleware, controller.permanentlyDeleteDocument);
router.put('/documents/:id/move', authMiddleware, controller.moveDocument);
router.get('/documents/folder/:folderId', authMiddleware, controller.getDocumentsByFolder);
router.get('/documents/search-deleted', authMiddleware, controller.searchDeletedDocuments);
router.get('/documents/workspace/:workspaceId', authMiddleware, controller.getDocByWorkspace);
router.get('/documents/workspace/:workspaceId/structure', authMiddleware, controller.getDocumentsWithStructure);

router.get('/documents/:docId/versions',authMiddleware ,controller.getDocumentVersions);
router.post('/documents/:documentId/versions/:versionId/restore',authMiddleware ,controller.restoreDocumentVersion);
router.delete('/documents/versions/:versionId',authMiddleware ,controller.deleteDocumentVersion); 
module.exports = router;
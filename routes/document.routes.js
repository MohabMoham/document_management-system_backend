
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
router.get('/workspace/:workspaceId', authMiddleware,checkRole(['user']),controller.getDocByWorkspace);
router.get('/documents/search', authMiddleware, controller.searchDocuments);
router.get('/documents/deleted', authMiddleware, controller.getDeletedDocuments);
router.patch('/documents/:id/restore', authMiddleware, controller.restoreDocument);
router.delete('/documents/:id/permanent', authMiddleware, controller.permanentlyDeleteDocument);
module.exports = router;

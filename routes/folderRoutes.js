
const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folder.controller');
const { authMiddleware, checkRole } = require('../middlewares/authMiddleware');

// Folder CRUD operations
router.post('/', authMiddleware, folderController.createFolder);
router.get('/:id', authMiddleware, folderController.getFolder);
router.put('/:id', authMiddleware, folderController.updateFolder);
router.delete('/:id', authMiddleware, folderController.deleteFolder);

// Workspace-specific folder operations
router.get('/workspace/:workspaceId', authMiddleware, folderController.getFoldersByWorkspace);
router.get('/workspace/:workspaceId/tree', authMiddleware, folderController.getFolderTree);

// Recycle bin operations
router.get('/deleted/list', authMiddleware, folderController.getDeletedFolders);
router.put('/:id/restore', authMiddleware, folderController.restoreFolder);
router.delete('/:id/permanent', authMiddleware, folderController.permanentlyDeleteFolder);

// Search folders
router.get('/search/query', authMiddleware, folderController.searchFolders);
module.exports = router;
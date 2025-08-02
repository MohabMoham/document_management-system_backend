
const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspaceController');
const { authMiddleware, checkRole } = require('../middlewares/authMiddleware');
router.post('/workspaces', authMiddleware , checkRole(['user']),workspaceController.createWorkspace);
router.get('/workspaces',authMiddleware ,checkRole(['user']), workspaceController.getWorkspacesByNID);
router.patch('/workspaces/:id', authMiddleware,checkRole(['user']),workspaceController.updateWorkspace);
router.delete('/workspaces/:id',authMiddleware,checkRole(['user']),workspaceController.deleteWorkspace);


module.exports = router;

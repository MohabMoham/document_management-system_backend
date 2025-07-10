
const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspaceController');
const auth = require('../middlewares/authMiddleware');
router.post('/workspaces', auth ,workspaceController.createWorkspace);
router.get('/workspaces/:nid',auth ,workspaceController.getWorkspacesByNID);
router.patch('/workspaces/:id', auth,workspaceController.updateWorkspace);
router.delete('/workspaces/:id',auth,workspaceController.deleteWorkspace);

module.exports = router;

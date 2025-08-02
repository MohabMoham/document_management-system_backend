const workspaceService = require('../services/workspace.service');

exports.createWorkspace = async (req, res) => {
  try {
    const workspace = await workspaceService.createWorkspace(req.user.id, req.body);
    res.status(201).json(workspace);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error creating workspace.' });
  }
};

exports.getWorkspacesByNID = async (req, res) => {
  try {
    const workspaces = await workspaceService.getWorkspacesByNID(req.user.id);
    res.json(workspaces);
  } catch (err) {
    const status = err.message === 'Unauthorized' ? 403 : 500;
    res.status(status).json({ message: err.message || 'Error fetching workspaces.' });
  }
};

exports.updateWorkspace = async (req, res) => {
  try {
    const updated = await workspaceService.updateWorkspace(req.user.id, req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    const status = err.message === 'Unauthorized' ? 403 : 500;
    res.status(status).json({ message: err.message || 'Error updating workspace.' });
  }
};

exports.deleteWorkspace = async (req, res) => {
  try {
    const result = await workspaceService.deleteWorkspace(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    const status = err.message === 'Unauthorized' ? 403 : 500;
    res.status(status).json({ message: err.message || 'Error deleting workspace.' });
  }
};


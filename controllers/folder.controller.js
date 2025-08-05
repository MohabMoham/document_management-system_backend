const folderService = require('../services/folder.service');

exports.createFolder = async (req, res) => {
  try {
    const userId = req.user.id;
    const newFolder = await folderService.createFolder(userId, req.body);
    res.status(201).json(newFolder);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getFolder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const folder = await folderService.getFolder(userId, id);
    res.status(200).json(folder);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

exports.getFoldersByWorkspace = async (req, res) => {
  try {
    const userId = req.user.id;
    const { workspaceId } = req.params;
    const { parentFolderId } = req.query;
    
    const folders = await folderService.getFoldersByWorkspace(
      userId, 
      workspaceId, 
      parentFolderId || null
    );
    
    res.status(200).json({
      count: folders.length,
      results: folders
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getFolderTree = async (req, res) => {
  try {
    const userId = req.user.id;
    const { workspaceId } = req.params;
    const { parentFolderId } = req.query;
    
    const tree = await folderService.getFolderTree(
      userId, 
      workspaceId, 
      parentFolderId || null
    );
    
    res.status(200).json(tree);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateFolder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updatedFolder = await folderService.updateFolder(userId, id, req.body);
    res.status(200).json(updatedFolder);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteFolder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const result = await folderService.deleteFolder(userId, id);
    res.status(200).json(result);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
};

exports.getDeletedFolders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { workspaceId } = req.query;
    const deletedFolders = await folderService.getDeletedFolders(userId, workspaceId);
    res.status(200).json({
      count: deletedFolders.length,
      results: deletedFolders
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.restoreFolder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const result = await folderService.restoreFolder(userId, id);
    res.status(200).json(result);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
};

exports.permanentlyDeleteFolder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const result = await folderService.permanentlyDeleteFolder(userId, id);
    res.status(200).json(result);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
};

exports.searchFolders = async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = req.query;
    const results = await folderService.searchFolders(userId, filters);
    res.status(200).json({
      count: results.length,
      results: results
    });
  } catch (error) {
    console.error('SearchFolders Controller Error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};
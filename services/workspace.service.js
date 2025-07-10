const Workspace = require('../models/workspace.model');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

async function getUserNID(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { nationalId: true }
  });
  return user?.nationalId;
}

async function createWorkspace(userId, { title, type, structure }) {
  const userNID = await getUserNID(userId);
  if (!userNID) throw new Error('User not found.');

  const workspace = await Workspace.create({
    userNID,
    title,
    type,
    structure
  });
  return workspace;
}

async function getWorkspacesByNID(nid) {
  return await Workspace.find({ userNID: nid });
}

async function updateWorkspace(userId, id, updatedData) {
  const userNID = await getUserNID(userId);
  const workspace = await Workspace.findById(id);

  if (!workspace) throw new Error('Workspace not found.');
  if (workspace.userNID !== userNID) throw new Error('Unauthorized');

  return await Workspace.findByIdAndUpdate(id, updatedData, { new: true });
}

async function deleteWorkspace(userId, id) {
  const userNID = await getUserNID(userId);
  const workspace = await Workspace.findById(id);

  if (!workspace) throw new Error('Workspace not found.');
  if (workspace.userNID !== userNID) throw new Error('Unauthorized');

  await Workspace.findByIdAndDelete(id);
  return { message: 'Workspace deleted successfully.' };
}

module.exports = {
  createWorkspace,
  getWorkspacesByNID,
  updateWorkspace,
  deleteWorkspace
};

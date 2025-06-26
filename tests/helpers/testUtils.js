const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Project, Task, ProjectMember } = require('../../models');

// Create test user
const createTestUser = async (userData = {}) => {
  const defaultUser = {
    email: 'test@example.com',
    password: await bcrypt.hash('password123', 12),
    firstName: 'Test',
    lastName: 'User',
    role: 'member',
    isActive: true
  };

  return await User.create({ ...defaultUser, ...userData });
};

// Create test admin user
const createTestAdmin = async () => {
  return await createTestUser({
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin'
  });
};

// Create test manager user
const createTestManager = async () => {
  return await createTestUser({
    email: 'manager@example.com',
    firstName: 'Manager',
    lastName: 'User',
    role: 'manager'
  });
};

// Generate JWT token for user
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
};

// Create test project
const createTestProject = async (ownerId, projectData = {}) => {
  const defaultProject = {
    name: 'Test Project',
    description: 'A test project for testing purposes',
    status: 'active',
    priority: 'medium',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    budget: 10000.00,
    progress: 0,
    ownerId
  };

  const project = await Project.create({ ...defaultProject, ...projectData });

  // Add owner as project member
  await ProjectMember.create({
    projectId: project.id,
    userId: ownerId,
    role: 'owner'
  });

  return project;
};

// Create test task
const createTestTask = async (projectId, createdById, taskData = {}) => {
  const defaultTask = {
    title: 'Test Task',
    description: 'A test task for testing purposes',
    status: 'todo',
    priority: 'medium',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    estimatedHours: 8,
    actualHours: 0,
    tags: ['test'],
    projectId,
    createdById
  };

  return await Task.create({ ...defaultTask, ...taskData });
};

// Add user to project
const addUserToProject = async (projectId, userId, role = 'member') => {
  return await ProjectMember.create({
    projectId,
    userId,
    role
  });
};

// Create multiple test users
const createMultipleUsers = async (count = 3) => {
  const users = [];
  for (let i = 0; i < count; i++) {
    const user = await createTestUser({
      email: `user${i + 1}@example.com`,
      firstName: `User${i + 1}`,
      lastName: 'Test'
    });
    users.push(user);
  }
  return users;
};

// Create project with members
const createProjectWithMembers = async (ownerId, memberIds = []) => {
  const project = await createTestProject(ownerId);
  
  // Add members to project
  for (const memberId of memberIds) {
    await addUserToProject(project.id, memberId, 'member');
  }
  
  return project;
};

// Create task with assignee
const createTaskWithAssignee = async (projectId, createdById, assigneeId) => {
  return await createTestTask(projectId, createdById, {
    assigneeId,
    title: 'Assigned Task',
    description: 'A task with an assignee'
  });
};

// Mock request object
const mockRequest = (user = null, body = {}, params = {}, query = {}) => {
  return {
    user,
    body,
    params,
    query,
    header: jest.fn().mockReturnValue(null)
  };
};

// Mock response object
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

// Mock next function
const mockNext = jest.fn();

// Validation error helper
const expectValidationError = (response, field, message) => {
  expect(response.status).toBe(400);
  expect(response.body.errors).toBeDefined();
  const error = response.body.errors.find(err => err.field === field);
  expect(error).toBeDefined();
  if (message) {
    expect(error.message).toContain(message);
  }
};

// Success response helper
const expectSuccessResponse = (response, statusCode = 200) => {
  expect(response.status).toBe(statusCode);
  expect(response.body).toBeDefined();
};

// Error response helper
const expectErrorResponse = (response, statusCode, message) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.message).toBeDefined();
  if (message) {
    expect(response.body.message).toContain(message);
  }
};

module.exports = {
  createTestUser,
  createTestAdmin,
  createTestManager,
  generateToken,
  createTestProject,
  createTestTask,
  addUserToProject,
  createMultipleUsers,
  createProjectWithMembers,
  createTaskWithAssignee,
  mockRequest,
  mockResponse,
  mockNext,
  expectValidationError,
  expectSuccessResponse,
  expectErrorResponse
};
